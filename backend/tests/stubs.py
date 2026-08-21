"""Scripted chat model for deterministic graph/API tests without network."""

from typing import Any, List, Optional

from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult


class ScriptedChatModel(BaseChatModel):
    """Emits queued AIMessages in order; raises once the script is exhausted."""

    script: List[AIMessage]

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        if not self.script:
            raise AssertionError("ScriptedChatModel script exhausted.")
        return ChatResult(generations=[ChatGeneration(message=self.script.pop(0))])

    def bind_tools(self, tools: Any, **kwargs: Any) -> "ScriptedChatModel":
        return self


def install_script(monkeypatch: Any, responses: List[AIMessage], module_path: str = "app.agent.graph") -> None:
    """Point <module_path>.get_llm at a scripted model."""
    model = ScriptedChatModel(script=list(responses))
    monkeypatch.setattr(f"{module_path}.get_llm", lambda: model)


def tool_call_msg(name: str, args: dict, call_id: str = "call_1") -> AIMessage:
    return AIMessage(
        content="",
        tool_calls=[{"name": name, "args": args, "id": call_id, "type": "tool_call"}],
    )
