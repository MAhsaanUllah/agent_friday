from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class RunAgentRequest(BaseModel):
    """Payload to start a new agent run."""

    message: str = Field(min_length=1)
    thread_id: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    allowlist: Optional[List[str]] = None


class ToolCallView(BaseModel):
    """A tool call awaiting human approval."""

    id: str
    name: str
    args: Dict[str, Any]


class MessageView(BaseModel):
    """A transcript entry rendered in the UI."""

    role: Literal["user", "assistant", "tool"]
    content: str
    timestamp: Optional[str] = None


class RunAgentResponse(BaseModel):
    """Result of a (possibly interrupted) run invocation."""

    thread_id: str
    status: Literal["completed", "awaiting_approval"]
    plan: Optional[str] = None
    messages: List[MessageView]
    pending_tool_calls: List[ToolCallView]


class ResumeAgentRequest(BaseModel):
    """Human decision on the pending tool calls of an interrupted run."""

    thread_id: str
    approved: bool


class ResumeAgentResponse(BaseModel):
    """Result of resuming an interrupted run."""

    thread_id: str
    status: Literal["completed", "awaiting_approval"]
    plan: Optional[str] = None
    messages: List[MessageView]
    pending_tool_calls: List[ToolCallView]
