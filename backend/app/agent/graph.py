import logging
import os
import sqlite3
from pathlib import Path
from typing import Literal
from langchain_core.messages import AIMessage, SystemMessage, ToolMessage
from langgraph.graph import StateGraph, START
from langgraph.checkpoint.memory import MemorySaver
from .state import AgentState
from .tools import AVAILABLE_TOOLS, is_tool_safe
from .llm import get_llm
from .memory import get_memory_context_string, append_recent_task

logger = logging.getLogger("agent.friday")

# Local, offline, file-based persistence (no server, no network).
# Override with AGENT_CHECKPOINT_DB to point at any sqlite file.
def _checkpoint_db_path() -> str:
    env = os.getenv("AGENT_CHECKPOINT_DB")
    if env:
        return env
    return str(Path(".friday") / "checkpoints.sqlite")


_CHECKPOINTER = None


def _build_checkpointer():
    """Return a persistent local checkpointer, falling back to in-memory on failure."""
    global _CHECKPOINTER
    if _CHECKPOINTER is not None:
        return _CHECKPOINTER
    try:
        from langgraph.checkpoint.sqlite import SqliteSaver

        db_path = _checkpoint_db_path()
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(db_path, check_same_thread=False)
        saver = SqliteSaver(conn)
        saver.setup()
        _CHECKPOINTER = saver
        logger.info("CHECKPOINTER ▶ SQLite persistence at %s", db_path)
    except Exception as exc:
        logger.warning("CHECKPOINTER ⚠ SQLite unavailable (%s); using in-memory (state lost on restart).", exc)
        _CHECKPOINTER = MemorySaver()
    return _CHECKPOINTER

# Runtime lookup: tool name -> tool object.
TOOL_REGISTRY = {t.name: t for t in AVAILABLE_TOOLS}

# Highest-risk tools are opt-in: the LLM only gets them when the operator
# explicitly lists them in AGENT_TOOL_ALLOWLIST. Disabled by default.
OPT_IN_TOOLS = {"run_terminal_command"}


def _select_tools():
    """Tools offered to the LLM, optionally restricted by AGENT_TOOL_ALLOWLIST.

    Read at call time so the env var can be changed without a restart.
    When no allowlist is set, opt-in (full-PC) tools are excluded by default.
    """
    allowlist = [t.strip() for t in os.getenv("AGENT_TOOL_ALLOWLIST", "").split(",") if t.strip()]
    if not allowlist:
        return [t for t in AVAILABLE_TOOLS if t.name not in OPT_IN_TOOLS]
    return [t for t in AVAILABLE_TOOLS if t.name in allowlist]

MAX_ITERATIONS = 8

PLANNER_SYSTEM_PROMPT = (
    "You are the planner of Agent Friday. Break the user goal into short, "
    "sequential, deterministic steps. Output STRICTLY a numbered list, one "
    "step per line (e.g. '1. Do X'). No preamble, no closing remarks.\n\n"
    "{memory}"
)

EXECUTOR_SYSTEM_PROMPT = (
    "You are Agent Friday, an autonomous high-intelligence executor.\n"
    "Approved plan:\n{plan}\n\n"
    "Local Knowledge & Memory:\n{memory}\n\n"
    "Rules:\n"
    "- Work through the plan sequentially and efficiently.\n"
    "- SINGLE-PASS SEARCH & ACTION RULE: When searching, opening a window, or executing a task, if the initial observation confirms execution or provides sufficient factual data, DO NOT make redundant duplicate calls. Immediately summarize and finalize.\n"
    "- WINDOW & ENVIRONMENT AWARENESS: If an action opened a browser/window or if a target window was closed by the user, DO NOT loop or re-call the same tool repeatedly. Acknowledge the state, inform the user, and finish.\n"
    "- When an action is required, call exactly one tool per turn; risky "
    "tools are gated by human approval automatically, so call them normally.\n"
    "- Use prior tool observations in the transcript before acting again.\n"
    "- When the goal is achieved, reply with a clean, structured, high-quality markdown response "
    "with bold headers, bullet points, and key takeaways, and make no more tool calls."
)

# Runtime lookup: tool name -> tool object.
TOOL_REGISTRY = {t.name: t for t in AVAILABLE_TOOLS}

_COMPILED_GRAPH = None


def planner_node(state: AgentState) -> dict:
    """Generates the plan based on user request and local PC memory."""
    logger.info("PLANNER ▶ generating plan")
    llm = get_llm()
    memory_ctx = get_memory_context_string()
    response = llm.invoke(
        [SystemMessage(content=PLANNER_SYSTEM_PROMPT.format(memory=memory_ctx)), *state["messages"]]
    )
    plan_text = str(response.content) if response.content else ""
    logger.info("PLANNER ✔ plan:\n%s", plan_text)
    return {"plan": plan_text, "iterations": 0}


def executor_node(state: AgentState) -> dict:
    """Determines the next tool to call or finishes execution."""
    iterations = state.get("iterations", 0) or 0
    logger.info("EXECUTOR ▶ step %d/%d", iterations + 1, MAX_ITERATIONS)
    if iterations >= MAX_ITERATIONS:
        logger.warning("EXECUTOR ⛔ iteration budget reached")
        halt = AIMessage(content="Execution halted: maximum iteration budget reached.")
        return {
            "messages": [halt],
            "pending_tool_calls": [],
            "iterations": iterations,
        }

    llm = get_llm().bind_tools(_select_tools())
    memory_ctx = get_memory_context_string()
    context = [
        SystemMessage(
            content=EXECUTOR_SYSTEM_PROMPT.format(
                plan=state.get("plan") or "",
                memory=memory_ctx
            )
        ),
        *state["messages"],
    ]
    response = llm.invoke(context)
    pending = [
        {"name": tc["name"], "args": tc["args"], "id": tc["id"]}
        for tc in getattr(response, "tool_calls", None) or []
    ]
    return {
        "messages": [response],
        "pending_tool_calls": pending,
        "iterations": iterations + 1,
    }


def evaluate_tools_node(state: AgentState) -> Literal["execute_tool", "human_gate", "__end__"]:
    """Routes based on the risk level of pending tool calls."""
    pending = state.get("pending_tool_calls", [])
    if not pending:
        return "__end__"

    for call in pending:
        if not is_tool_safe(call["name"]):
            return "human_gate"

    return "execute_tool"

def human_gate_node(state: AgentState) -> dict:
    """Pause execution for human approval.

    The graph compiles with interrupt_before=["human_gate"], so control stops
    before this node runs. On resume, approval_status has already been injected
    via update_state; this node is a passthrough and routing happens below it.
    """
    return {}


def route_after_gate(state: AgentState) -> Literal["execute_tool", "handle_rejection"]:
    """Routes the resumed run to execution or rejection handling."""
    if state.get("approval_status") == "denied":
        return "handle_rejection"
    return "execute_tool"


def execute_tool_node(state: AgentState) -> dict:
    """Executes the tool after approval or if safe."""
    new_messages: list = []
    log_entries: list[dict] = []
    for call in state.get("pending_tool_calls", []):
        name = call["name"]
        args = call.get("args", {})
        tool_obj = TOOL_REGISTRY.get(name)
        if tool_obj is None:
            observation = f"Error: unknown tool '{name}'."
            status = "error"
        else:
            try:
                observation = str(tool_obj.invoke(args))
                status = "ok"
            except Exception as exc:
                observation = f"Tool error: {exc}"
                status = "error"
        new_messages.append(
            ToolMessage(content=observation, tool_call_id=call.get("id", ""), name=name)
        )
        log_entries.append({"name": name, "args": args, "status": status, "result": observation[:500]})
    return {
        "messages": new_messages,
        "pending_tool_calls": [],
        "approval_status": "approved",
        "tool_log": log_entries,
    }


def handle_rejection_node(state: AgentState) -> dict:
    """Handles human denial of a tool call."""
    new_messages: list = []
    for call in state.get("pending_tool_calls", []):
        new_messages.append(
            ToolMessage(
                content="User denied this tool call. Do not retry it.",
                tool_call_id=call.get("id", ""),
                name=call["name"],
            )
        )
    return {
        "messages": new_messages,
        "pending_tool_calls": [],
        "approval_status": "denied",
    }


def build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("planner", planner_node)
    builder.add_node("executor", executor_node)
    builder.add_node("human_gate", human_gate_node)
    builder.add_node("execute_tool", execute_tool_node)
    builder.add_node("handle_rejection", handle_rejection_node)

    builder.add_edge(START, "planner")
    builder.add_edge("planner", "executor")

    # Conditional edge from executor to evaluate tools
    builder.add_conditional_edges("executor", evaluate_tools_node)

    builder.add_conditional_edges("human_gate", route_after_gate)
    builder.add_edge("execute_tool", "executor")
    builder.add_edge("handle_rejection", "executor")

    # HITL: pause before the gate; /agent/resume injects approval_status and continues.
    return builder.compile(checkpointer=_build_checkpointer(), interrupt_before=["human_gate"])


def get_compiled_graph():
    """Return the process-wide compiled graph singleton."""
    global _COMPILED_GRAPH
    if _COMPILED_GRAPH is None:
        _COMPILED_GRAPH = build_graph()
    return _COMPILED_GRAPH
