from types import SimpleNamespace

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agent.llm import ChatLiteLLM, _to_litellm_message

# Pin a non-DeepSeek model so parsing tests don't require an API key.
def _model() -> ChatLiteLLM:
    return ChatLiteLLM(model_name="gemini/gemini-2.0-flash")


class TestMessageConversion:
    def test_system_and_human(self):
        assert _to_litellm_message(SystemMessage(content="sys")) == {
            "role": "system",
            "content": "sys",
        }
        assert _to_litellm_message(HumanMessage(content="hi")) == {
            "role": "user",
            "content": "hi",
        }

    def test_ai_with_tool_calls(self):
        ai = AIMessage(
            content="",
            tool_calls=[{"name": "web_search", "args": {"query": "x"}, "id": "c1"}],
        )
        payload = _to_litellm_message(ai)
        assert payload["role"] == "assistant"
        assert payload["tool_calls"][0]["function"]["name"] == "web_search"
        assert payload["tool_calls"][0]["id"] == "c1"

    def test_tool_result(self):
        tool_msg = ToolMessage(content="42", tool_call_id="c1", name="math_calculator")
        payload = _to_litellm_message(tool_msg)
        assert payload == {"role": "tool", "tool_call_id": "c1", "content": "42"}


class TestGenerate:
    def _patch_completion(self, monkeypatch, message):
        response = SimpleNamespace(choices=[SimpleNamespace(message=message)])
        captured = {}

        def fake_completion(**kwargs):
            captured.update(kwargs)
            return response

        import app.agent.llm as llm_module

        monkeypatch.setattr(llm_module.litellm, "completion", fake_completion)
        return captured

    def test_parses_content_and_tool_calls(self, monkeypatch):
        raw_tool_call = SimpleNamespace(
            id="c9",
            function=SimpleNamespace(name="math_calculator", arguments='{"expression": "1+1"}'),
        )
        captured = self._patch_completion(
            monkeypatch,
            SimpleNamespace(content="thinking", tool_calls=[raw_tool_call]),
        )
        result = _model().invoke([HumanMessage(content="go")])
        assert result.content == "thinking"
        assert result.tool_calls[0]["name"] == "math_calculator"
        assert result.tool_calls[0]["args"] == {"expression": "1+1"}
        assert result.tool_calls[0]["id"] == "c9"
        assert captured["messages"][0] == {"role": "user", "content": "go"}

    def test_malformed_arguments_become_empty_args(self, monkeypatch):
        raw_tool_call = SimpleNamespace(
            id="c1", function=SimpleNamespace(name="t", arguments="not-json")
        )
        self._patch_completion(
            monkeypatch, SimpleNamespace(content="", tool_calls=[raw_tool_call])
        )
        result = _model().invoke([HumanMessage(content="go")])
        assert result.tool_calls[0]["args"] == {}

    def test_null_content_becomes_empty_string(self, monkeypatch):
        self._patch_completion(monkeypatch, SimpleNamespace(content=None, tool_calls=None))
        result = _model().invoke([HumanMessage(content="go")])
        assert result.content == ""

    def test_bind_tools_passes_openai_schema(self, monkeypatch):
        captured = self._patch_completion(
            monkeypatch, SimpleNamespace(content="ok", tool_calls=None)
        )

        class DummyTool:
            name = "dummy"
            description = "d"
            args_schema = None

        from langchain_core.tools import tool as lc_tool

        @lc_tool
        def dummy(x: int) -> str:
            """Return x."""
            return str(x)

        bound = _model().bind_tools([dummy])
        bound.invoke([HumanMessage(content="go")])
        assert captured["tools"][0]["function"]["name"] == "dummy"
