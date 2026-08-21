"""Agent Friday FastAPI server.

Endpoints:
    POST /agent/run     - start a run for a thread (may interrupt at the human gate)
    POST /agent/resume  - inject the approval decision and continue an interrupted run
    GET  /mcp/servers   - list configured MCP servers and their statuses
    GET  /health        - liveness + capability probe
"""

import logging
import os
import json
import uuid
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage

from app.agent.graph import get_compiled_graph
from app.agent.mcp_client import get_configured_servers_status
from app.agent.state import AgentState
from api.schemas import (
    MessageView,
    ResumeAgentRequest,
    ResumeAgentResponse,
    RunAgentRequest,
    RunAgentResponse,
    ToolCallView,
)
from api.security import require_api_key

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")
logger = logging.getLogger("api.friday")

PROVIDER_KEYS = [
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "DEEPSEEK_API_KEY",
    "OPENROUTER_API_KEY",
    "GROQ_API_KEY",
]

app = FastAPI(title="Agent Friday", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5174"), "http://localhost:5173"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


def _serialize_state(thread_id: str, state: AgentState, interrupted: bool) -> dict:
    from datetime import datetime
    now_str = datetime.now().strftime("%I:%M %p")
    messages = []
    for m in state.get("messages", []):
        if m.type == "human":
            messages.append({"role": "user", "content": str(m.content), "timestamp": now_str})
        elif m.type == "ai":
            content = str(m.content)
            if content:
                messages.append({"role": "assistant", "content": content, "timestamp": now_str})
        elif m.type == "tool":
            messages.append({"role": "tool", "content": str(m.content), "timestamp": now_str})
    pending = [
        {"id": c.get("id", ""), "name": c["name"], "args": c.get("args", {})}
        for c in state.get("pending_tool_calls", [])
    ]
    status = "awaiting_approval" if interrupted else "completed"
    return {
        "thread_id": thread_id,
        "status": status,
        "plan": state.get("plan"),
        "messages": messages,
        "pending_tool_calls": pending,
    }


@app.post("/agent/run", response_model=RunAgentResponse, dependencies=[Depends(require_api_key)])
def run_agent(request: RunAgentRequest) -> RunAgentResponse:
    """Start a run: plan the goal and execute until completion or the human gate.

    Model, provider key, and tool allowlist may be supplied per-request (BYOK /
    Setup Wizard) and override the server .env for this invocation. For a local
    single-user agent this is fine; if the API is exposed, require AGENT_API_KEY.
    """
    if request.model:
        os.environ["LLM_MODEL"] = request.model
    if request.api_key:
        if "gemini" in (request.model or ""):
            os.environ["GEMINI_API_KEY"] = request.api_key
        elif "deepseek" in (request.model or ""):
            os.environ["DEEPSEEK_API_KEY"] = request.api_key
        elif "openai" in (request.model or ""):
            os.environ["OPENAI_API_KEY"] = request.api_key
        elif "anthropic" in (request.model or ""):
            os.environ["ANTHROPIC_API_KEY"] = request.api_key
        elif "groq" in (request.model or ""):
            os.environ["GROQ_API_KEY"] = request.api_key
    if request.allowlist is not None:
        os.environ["AGENT_TOOL_ALLOWLIST"] = ",".join(t for t in request.allowlist if t)

    graph = get_compiled_graph()
    thread_id = request.thread_id or uuid.uuid4().hex
    config = {"configurable": {"thread_id": thread_id}}
    try:
        graph.invoke({"messages": [HumanMessage(content=request.message)]}, config)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Agent execution failed: {exc}") from exc
    snapshot = graph.get_state(config)
    return RunAgentResponse(**_serialize_state(thread_id, snapshot.values, bool(snapshot.next)))


@app.post("/agent/resume", response_model=ResumeAgentResponse, dependencies=[Depends(require_api_key)])
def resume_agent(request: ResumeAgentRequest) -> ResumeAgentResponse:
    """Resume an interrupted run after injecting the human decision."""
    graph = get_compiled_graph()
    config = {"configurable": {"thread_id": request.thread_id}}
    snapshot = graph.get_state(config)
    if not snapshot.next:
        raise HTTPException(status_code=409, detail="No pending interruption for this thread.")
    try:
        graph.update_state(config, {"approval_status": "approved" if request.approved else "denied"})
        graph.invoke(None, config)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Agent resume failed: {exc}") from exc
    final = graph.get_state(config)
    return ResumeAgentResponse(**_serialize_state(request.thread_id, final.values, bool(final.next)))


def _stream_graph(request: RunAgentRequest):
    """Yield SSE events as the graph executes (planner/executor/tool progress)."""
    if request.model:
        os.environ["LLM_MODEL"] = request.model
    if request.api_key:
        if "gemini" in (request.model or ""):
            os.environ["GEMINI_API_KEY"] = request.api_key
        elif "deepseek" in (request.model or ""):
            os.environ["DEEPSEEK_API_KEY"] = request.api_key
        elif "openai" in (request.model or ""):
            os.environ["OPENAI_API_KEY"] = request.api_key
        elif "anthropic" in (request.model or ""):
            os.environ["ANTHROPIC_API_KEY"] = request.api_key
        elif "groq" in (request.model or ""):
            os.environ["GROQ_API_KEY"] = request.api_key
            
    if request.allowlist is not None:
        os.environ["AGENT_TOOL_ALLOWLIST"] = ",".join(t for t in request.allowlist if t)

    graph = get_compiled_graph()
    thread_id = request.thread_id or uuid.uuid4().hex
    config = {"configurable": {"thread_id": thread_id}}
    try:
        for chunk in graph.stream({"messages": [HumanMessage(content=request.message)]}, config):
            yield f"event: node\ndata: {json.dumps({'nodes': list(chunk.keys())})}\n\n"
        snapshot = graph.get_state(config)
        yield f"event: done\ndata: {json.dumps(_serialize_state(thread_id, snapshot.values, bool(snapshot.next)))}\n\n"
    except Exception as exc:
        logger.exception("Streaming run failed")
        yield f"event: error\ndata: {json.dumps({'detail': str(exc)})}\n\n"


@app.post("/agent/run/stream", dependencies=[Depends(require_api_key)])
def run_agent_stream(request: RunAgentRequest) -> StreamingResponse:
    """Start a run and stream node-level progress as Server-Sent Events.

    Offline/local only. The client receives `node` events as the planner and
    executor run, then a final `done` event carrying the serialized state
    (which may be `awaiting_approval` if the human gate interrupted).
    """
    return StreamingResponse(_stream_graph(request), media_type="text/event-stream")


@app.get("/mcp/servers", dependencies=[Depends(require_api_key)])
def get_mcp_servers() -> list:
    """List all configured MCP servers and their connection statuses."""
    return get_configured_servers_status()


from app.agent.memory import get_local_memory, append_learned_fact


@app.get("/agent/memory")
def get_memory() -> dict:
    """Retrieve local persistent memory from .friday/memory.json."""
    return get_local_memory()


@app.post("/agent/memory")
def add_memory_fact(data: dict) -> dict:
    """Add a new learned fact or preference into local memory."""
    fact = data.get("fact", "").strip()
    if fact:
        append_learned_fact(fact)
    return get_local_memory()


def _extract_text_from_raw_pdf(raw_bytes: bytes) -> str:
    """Extract clean text from PDF bytes using pypdf or native flate stream parsing."""
    try:
        import pypdf
        import io
        reader = pypdf.PdfReader(io.BytesIO(raw_bytes))
        pages = [p.extract_text() for p in reader.pages if p.extract_text()]
        if pages:
            return "\n\n".join(pages)
    except Exception:
        pass

    import zlib
    import re
    extracted = []
    stream_pattern = re.compile(b"stream[\r\n]+(.*?)[\r\n]+endstream", re.DOTALL)
    for match in stream_pattern.finditer(raw_bytes):
        stream_data = match.group(1)
        decompressed = None
        for wbits in [0, -zlib.MAX_WBITS, zlib.MAX_WBITS]:
            try:
                decompressed = zlib.decompress(stream_data, wbits)
                break
            except Exception:
                continue
        if not decompressed:
            decompressed = stream_data

        # Text operands
        tj_matches = re.findall(b"\((.*?)\)\s*Tj", decompressed)
        for tj in tj_matches:
            try:
                t = tj.decode("utf-8", errors="ignore").strip()
                if len(t) > 1 or t.isalnum():
                    extracted.append(t)
            except Exception:
                pass

        tj_arrays = re.findall(b"\[(.*?)\]\s*TJ", decompressed)
        for tja in tj_arrays:
            parts = re.findall(b"\((.*?)\)", tja)
            line = "".join(p.decode("utf-8", errors="ignore") for p in parts).strip()
            if line:
                extracted.append(line)

    if extracted:
        # Join cleanly into formatted text
        return "\n".join(extracted)
    return raw_bytes.decode("utf-8", errors="ignore")


@app.post("/agent/upload")
def upload_document(data: dict) -> dict:
    """Store an uploaded file/document locally in .friday/uploads and return clean extracted text."""
    import base64
    filename = data.get("filename", "document.txt")
    raw_content = data.get("content", "")
    is_base64 = data.get("is_base64", False)

    upload_dir = Path(".friday") / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / filename

    extracted_text = ""
    try:
        if is_base64 or filename.lower().endswith(".pdf"):
            try:
                if "," in raw_content:
                    raw_content = raw_content.split(",", 1)[1]
                raw_bytes = base64.b64decode(raw_content)
            except Exception:
                raw_bytes = raw_content.encode("latin-1", errors="ignore")
            
            with open(file_path, "wb") as f:
                f.write(raw_bytes)
            
            if filename.lower().endswith(".pdf"):
                extracted_text = _extract_text_from_raw_pdf(raw_bytes)
            else:
                extracted_text = raw_bytes.decode("utf-8", errors="ignore")
        else:
            with open(file_path, "w", encoding="utf-8", errors="replace") as f:
                f.write(raw_content)
            extracted_text = raw_content

        preview = extracted_text[:1200]
        return {
            "status": "success",
            "filename": filename,
            "path": str(file_path.resolve()),
            "size": len(extracted_text),
            "text": extracted_text,
            "preview": preview,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"File upload failed: {exc}") from exc


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model": os.getenv("LLM_MODEL"),
        "llm_configured": any(os.getenv(k) for k in PROVIDER_KEYS),
        "mcp_servers": len(get_configured_servers_status()),
        "auth_required": bool(os.getenv("AGENT_API_KEY")),
    }


@app.get("/agent/threads")
def get_threads() -> list[dict]:
    """Fetch distinct chat threads from the SQLite checkpoints database."""
    import sqlite3
    try:
        db_path = Path(".friday") / "state.db"
        if not db_path.exists():
            return []
            
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row
            # Fetch unique threads. 
            cursor = conn.execute("SELECT DISTINCT thread_id FROM checkpoints ORDER BY thread_id DESC")
            rows = cursor.fetchall()
            threads = [{"id": row["thread_id"], "title": f"Session: {row['thread_id'][:8]}..."} for row in rows if row["thread_id"]]
            return threads
    except Exception as exc:
        print(f"Failed to fetch threads: {exc}")
        return []
