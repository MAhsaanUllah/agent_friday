import uuid

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.agent.graph import MAX_ITERATIONS, get_compiled_graph
from tests.stubs import install_script, tool_call_msg


def _fresh_config():
    return {"configurable": {"thread_id": f"t-{uuid.uuid4().hex}"}}


class TestSafeFlow:
    def test_planner_then_tool_then_finish(self, monkeypatch):
        install_script(
            monkeypatch,
            [
                AIMessage(content="1. Search\n2. Summarize"),
                tool_call_msg("math_calculator", {"expression": "21*2"}, "c1"),
                AIMessage(content="LangGraph is a graph framework."),
            ],
        )
        graph = get_compiled_graph()
        final_state = graph.invoke(
            {"messages": [HumanMessage(content="research langgraph")]}, _fresh_config()
        )

        assert final_state["plan"].startswith("1.")
        assert final_state["iterations"] == 2
        assert final_state["pending_tool_calls"] == []
        tool_messages = [m for m in final_state["messages"] if m.type == "tool"]
        assert len(tool_messages) == 1
        assert tool_messages[0].content == "42"
        assert final_state["tool_log"][0]["name"] == "math_calculator"
        assert final_state["tool_log"][0]["status"] == "ok"

    def test_unknown_tool_gated_then_reported(self, monkeypatch):
        install_script(
            monkeypatch,
            [
                AIMessage(content="1. Try unknown tool"),
                tool_call_msg("nonexistent_tool", {}, "c1"),
                AIMessage(content="Handled gracefully."),
            ],
        )
        graph = get_compiled_graph()
        config = _fresh_config()
        graph.invoke({"messages": [HumanMessage(content="x")]}, config)

        # Unknown tools default to unsafe -> interrupted at the gate.
        assert graph.get_state(config).next == ("human_gate",)

        install_script(monkeypatch, [AIMessage(content="Handled gracefully.")])
        graph.update_state(config, {"approval_status": "approved"})
        final_state = graph.invoke(None, config)
        tool_messages = [m for m in final_state["messages"] if m.type == "tool"]
        assert tool_messages[0].content.startswith("Error: unknown tool")


class TestHitlFlow:
    @pytest.fixture()
    def interrupted(self, monkeypatch):
        install_script(
            monkeypatch,
            [
                AIMessage(content="1. Notify"),
                tool_call_msg(
                    "send_email", {"to": "a@b.c", "subject": "s", "body": "b"}, "c9"
                ),
            ],  # script intentionally ends: run must pause at the gate
        )
        graph = get_compiled_graph()
        config = _fresh_config()
        graph.invoke({"messages": [HumanMessage(content="email alice")]}, config)
        return graph, config

    def test_interrupts_before_human_gate(self, interrupted):
        graph, config = interrupted
        snapshot = graph.get_state(config)
        assert snapshot.next == ("human_gate",)
        pending = snapshot.values["pending_tool_calls"]
        assert pending[0]["name"] == "send_email"
        assert any(m.type == "human" for m in snapshot.values["messages"])

    def test_resume_approved_executes_tool(self, interrupted, monkeypatch):
        graph, config = interrupted
        install_script(monkeypatch, [AIMessage(content="Email dispatched.")])
        graph.update_state(config, {"approval_status": "approved"})
        final_state = graph.invoke(None, config)

        tool_messages = [m for m in final_state["messages"] if m.type == "tool"]
        assert "[SIMULATED] Email sent to a@b.c" in tool_messages[0].content
        assert final_state["messages"][-1].content == "Email dispatched."

    def test_resume_denied_feeds_rejection_back(self, interrupted, monkeypatch):
        graph, config = interrupted
        install_script(monkeypatch, [AIMessage(content="Understood; skipping email.")])
        graph.update_state(config, {"approval_status": "denied"})
        final_state = graph.invoke(None, config)

        tool_messages = [m for m in final_state["messages"] if m.type == "tool"]
        assert "denied" in tool_messages[0].content
        assert final_state["approval_status"] == "denied"
        assert final_state["pending_tool_calls"] == []
        assert final_state["messages"][-1].content == "Understood; skipping email."


class TestLoopGuard:
    def test_halt_after_iteration_budget(self, monkeypatch):
        script = [AIMessage(content="1. Loop")]
        for i in range(MAX_ITERATIONS + 2):
            script.append(tool_call_msg("math_calculator", {"expression": f"{i}+1"}, f"c{i}"))
        install_script(monkeypatch, script)

        graph = get_compiled_graph()
        final_state = graph.invoke(
            {"messages": [HumanMessage(content="loop forever")]}, _fresh_config()
        )
        assert "maximum iteration budget" in str(final_state["messages"][-1].content)
        assert final_state["pending_tool_calls"] == []


class TestToolAllowlist:
    def test_allowlist_restricts_offered_tools(self, monkeypatch):
        monkeypatch.setenv("AGENT_TOOL_ALLOWLIST", "math_calculator,web_search")
        try:
            from app.agent import graph as graph_mod

            selected = graph_mod._select_tools()
            names = {t.name for t in selected}
            assert names == {"math_calculator", "web_search"}
        finally:
            monkeypatch.delenv("AGENT_TOOL_ALLOWLIST", raising=False)

    def test_empty_allowlist_excludes_opt_in_terminal(self):
        from app.agent import graph as graph_mod

        selected = graph_mod._select_tools()
        names = {t.name for t in selected}
        assert "run_terminal_command" not in names
        assert names == {t.name for t in graph_mod.AVAILABLE_TOOLS} - graph_mod.OPT_IN_TOOLS

    def test_terminal_offered_when_allowlisted(self, monkeypatch):
        monkeypatch.setenv("AGENT_TOOL_ALLOWLIST", "run_terminal_command")
        try:
            from app.agent import graph as graph_mod

            names = {t.name for t in graph_mod._select_tools()}
            assert names == {"run_terminal_command"}
        finally:
            monkeypatch.delenv("AGENT_TOOL_ALLOWLIST", raising=False)
