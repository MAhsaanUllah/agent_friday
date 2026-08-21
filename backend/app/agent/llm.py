"""LiteLLM-backed LangChain chat model with intelligent provider autodetection.

Routes every provider (gemini/, openai/, anthropic/, deepseek/,
openrouter/, groq/, ollama/) through one adapter. Automatically detects the active
provider based on which API key is present in environment variables.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Callable, Dict, Iterator, List, Optional, Sequence, cast

import litellm
from dotenv import load_dotenv
from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    ToolMessage,
)
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_core.runnables import Runnable
from langchain_core.tools import BaseTool
from langchain_core.utils.function_calling import convert_to_openai_tool

logger = logging.getLogger("agent.friday")


def reload_environment() -> None:
    """Reload environment variables dynamically from .env locations."""
    for p in [Path(".env"), Path("backend/.env"), Path("../.env"), Path.cwd() / ".env", Path.cwd() / "backend" / ".env"]:
        if p.exists():
            load_dotenv(p, override=True)


def get_api_key(var_name: str) -> Optional[str]:
    """Retrieve and sanitize API key from environment."""
    reload_environment()
    val = os.getenv(var_name)
    if val:
        cleaned = val.strip().strip("'\"")
        if cleaned:
            return cleaned
    return None


def resolve_active_model() -> str:
    """Intelligently detects and returns the active model name based on API keys."""
    reload_environment()
    explicit_model = os.getenv("LLM_MODEL")
    
    # Check present API keys
    has_deepseek = bool(get_api_key("DEEPSEEK_API_KEY"))
    has_gemini = bool(get_api_key("GEMINI_API_KEY") or get_api_key("GOOGLE_API_KEY"))
    has_openai = bool(get_api_key("OPENAI_API_KEY"))
    has_groq = bool(get_api_key("GROQ_API_KEY"))
    has_anthropic = bool(get_api_key("ANTHROPIC_API_KEY"))
    has_openrouter = bool(get_api_key("OPENROUTER_API_KEY"))

    # If an explicit model was set, use it
    if explicit_model:
        if explicit_model.startswith("ollama/"):
            return explicit_model
        if ("deepseek" in explicit_model) and has_deepseek:
            return explicit_model
        if ("gemini" in explicit_model) and has_gemini:
            return explicit_model
        if explicit_model.startswith("openai/") and has_openai:
            return explicit_model
        if explicit_model.startswith("groq/") and has_groq:
            return explicit_model
        if explicit_model.startswith("anthropic/") and has_anthropic:
            return explicit_model
        if explicit_model.startswith("openrouter/") and has_openrouter:
            return explicit_model

    # Auto-detection priority based on available keys
    if has_deepseek:
        return "deepseek/deepseek-chat"
    if has_gemini:
        return "gemini/gemini-2.0-flash"
    if has_groq:
        return "groq/llama-3.3-70b-versatile"
    if has_openai:
        return "openai/gpt-4o-mini"
    if has_anthropic:
        return "anthropic/claude-3-5-haiku-20241022"
    if has_openrouter:
        return "openrouter/deepseek/deepseek-chat"

    # Default fallback
    return explicit_model or "gemini/gemini-2.0-flash"


class ChatLiteLLM(BaseChatModel):
    """Minimal LangChain chat model delegating to litellm.completion."""

    model_name: Optional[str] = None
    temperature: float = 0.0
    model_kwargs: Dict[str, Any] = {}

    @property
    def _llm_type(self) -> str:
        return "litellm"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        active_model = self.model_name or resolve_active_model()
        
        call_kwargs: Dict[str, Any] = {
            "model": active_model,
            "messages": [_to_litellm_message(m) for m in messages],
            "temperature": self.temperature,
            "stop": stop,
        }
        if kwargs.get("tools"):
            call_kwargs["tools"] = kwargs.get("tools")

        # Local Ollama offline connection using OpenAI-compatible /v1 format
        if active_model.startswith("ollama/"):
            raw_model_name = active_model.replace("ollama/", "")
            call_kwargs["model"] = f"openai/{raw_model_name}"
            call_kwargs["api_base"] = "http://localhost:11434/v1"
            call_kwargs["api_key"] = "ollama"

        # Explicit DeepSeek official base URL and Key injection
        elif "deepseek" in active_model.lower():
            call_kwargs["api_base"] = "https://api.deepseek.com"
            deepseek_key = get_api_key("DEEPSEEK_API_KEY")
            if deepseek_key:
                call_kwargs["api_key"] = deepseek_key
            else:
                raise ValueError("Missing DeepSeek API key. Please check DEEPSEEK_API_KEY in your .env file.")

        try:
            response = litellm.completion(**call_kwargs)
        except Exception as exc:
            err_str = str(exc)
            if "11001" in err_str or "getaddrinfo" in err_str:
                raise ConnectionError(
                    "Network DNS failure reaching cloud AI provider. Please check your internet connection or switch to a Local Offline Ollama model in Settings."
                ) from exc
            raise exc

        raw = response.choices[0].message
        tool_calls = _parse_tool_calls(raw)
        ai_message = AIMessage(content=raw.content or "", tool_calls=tool_calls)
        return ChatResult(generations=[ChatGeneration(message=ai_message)])

    def _stream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> Iterator[ChatGenerationChunk]:
        """Yield chunks token-by-token for responsive UI (Partial implementation)."""
        active_model = self.model_name or resolve_active_model()
        formatted_messages = _format_messages_for_litellm(messages)
        call_kwargs = {
            "model": active_model,
            "messages": formatted_messages,
            "stop": stop,
            "stream": True,
            **kwargs,
            **self.model_kwargs,
        }

        # Apply the exact same routing rules as _generate
        if active_model.startswith("ollama/"):
            raw_model_name = active_model.replace("ollama/", "")
            call_kwargs["model"] = f"openai/{raw_model_name}"
            call_kwargs["api_base"] = "http://localhost:11434/v1"
            call_kwargs["api_key"] = "ollama"
        elif "gemini" in active_model.lower():
            call_kwargs["api_key"] = get_api_key("GEMINI_API_KEY")
        elif "deepseek" in active_model.lower():
            call_kwargs["api_base"] = "https://api.deepseek.com"
            deepseek_key = get_api_key("DEEPSEEK_API_KEY")
            if deepseek_key:
                call_kwargs["api_key"] = deepseek_key

        try:
            from langchain_core.messages import AIMessageChunk

            response = litellm.completion(**call_kwargs)
            for chunk in response:
                delta = chunk.choices[0].delta
                content = delta.content or ""
                msg_chunk = AIMessageChunk(content=content)
                gen_chunk = ChatGenerationChunk(message=msg_chunk)
                yield gen_chunk
                if run_manager:
                    run_manager.on_llm_new_token(content, chunk=gen_chunk)
        except Exception as exc:
            logger.exception("Streaming completion failed")
            raise exc

    def bind_tools(
        self,
        tools: Sequence[Dict[str, Any] | type | Callable[..., Any] | BaseTool],
        *,
        tool_choice: Optional[str] = None,
        **kwargs: Any,
    ) -> Runnable[Any, BaseMessage]:
        formatted = [convert_to_openai_tool(t) for t in tools]
        if tool_choice is not None:
            kwargs["tool_choice"] = tool_choice
        return cast(Runnable[Any, BaseMessage], self.bind(tools=formatted, **kwargs))


def _format_messages_for_litellm(messages: Sequence[BaseMessage]) -> list:
    """Convert LangChain messages to LiteLLM-compatible dicts for streaming."""
    return [_to_litellm_message(m) for m in messages]


def _to_litellm_message(message: BaseMessage) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"role": message.type}
    if isinstance(message, ToolMessage):
        payload["role"] = "tool"
        payload["tool_call_id"] = message.tool_call_id
        payload["content"] = message.content
        return payload
    if message.type == "system":
        payload["role"] = "system"
    elif message.type == "ai":
        payload["role"] = "assistant"
        tool_calls = getattr(message, "tool_calls", None)
        if tool_calls:
            payload["tool_calls"] = [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": {"name": tc["name"], "arguments": json.dumps(tc["args"])},
                }
                for tc in tool_calls
            ]
    else:
        payload["role"] = "user"
    content = message.content
    payload["content"] = content if isinstance(content, str) else json.dumps(content)
    return payload


def _parse_tool_calls(raw: Any) -> List[Dict[str, Any]]:
    parsed: List[Dict[str, Any]] = []
    for call in getattr(raw, "tool_calls", None) or []:
        try:
            args = json.loads(call.function.arguments or "{}")
        except json.JSONDecodeError:
            args = {}
        parsed.append(
            {
                "name": call.function.name,
                "args": args,
                "id": call.id or "",
                "type": "tool_call",
            }
        )
    return parsed


def get_llm(model: Optional[str] = None) -> ChatLiteLLM:
    """Return a chat model instance for graph nodes with dynamic provider resolution."""
    return ChatLiteLLM(model_name=model or resolve_active_model())
