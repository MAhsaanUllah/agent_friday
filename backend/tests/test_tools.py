import pytest

from app.agent import tools
from app.agent.tools import (
    delete_record,
    is_tool_safe,
    math_calculator,
    mock_db_query,
    send_email,
    update_db,
    web_search,
)


class FakeDDGS:
    def __init__(self, results):
        self._results = results

    def text(self, query, max_results=5):
        return self._results[:max_results]


@pytest.fixture(autouse=True)
def restore_db():
    snapshot = {t: {k: dict(v) for k, v in rows.items()} for t, rows in tools._DB.items()}
    yield
    tools._DB.clear()
    tools._DB.update(snapshot)


class TestRiskRegistry:
    def test_safe_tools(self):
        for name in ("web_search", "math_calculator", "mock_db_query"):
            assert is_tool_safe(name) is True

    def test_unsafe_tools(self):
        for name in ("send_email", "update_db", "delete_record"):
            assert is_tool_safe(name) is False

    def test_unknown_tool_defaults_unsafe(self):
        assert is_tool_safe("rm_rf") is False

    def test_registry_covers_available_tools(self):
        names = {t.name for t in tools.AVAILABLE_TOOLS}
        assert names == set(tools.TOOL_RISK_REGISTRY)


class TestCalculator:
    @pytest.mark.parametrize(
        ("expression", "expected"),
        [
            ("2+2", "4"),
            ("10/4", "2.5"),
            ("2**8", "256"),
            ("-3+5", "2"),
            ("(1+2)*3", "9"),
            ("7//2", "3"),
            ("7%3", "1"),
        ],
    )
    def test_valid_expressions(self, expression, expected):
        assert math_calculator.invoke({"expression": expression}) == expected

    @pytest.mark.parametrize(
        "expression",
        ["__import__('os').system('x')", "import os", "'a'*10**9", ""],
    )
    def test_rejects_non_arithmetic(self, expression):
        assert math_calculator.invoke({"expression": expression}).startswith("Error")


class TestMockDb:
    def test_query_all_and_single(self):
        result = mock_db_query.invoke({"table": "users"})
        assert '"Alice"' in result and '"Bob"' in result
        single = mock_db_query.invoke({"table": "users", "record_id": "u1"})
        assert '"admin"' in single

    def test_update_then_query(self):
        out = update_db.invoke(
            {"table": "tasks", "record_id": "t2", "data": {"status": "done"}}
        )
        assert '"done"' in out
        assert '"done"' in mock_db_query.invoke({"table": "tasks", "record_id": "t2"})

    def test_delete(self):
        out = delete_record.invoke({"table": "users", "record_id": "u2"})
        assert "Deleted" in out
        assert "Error" in mock_db_query.invoke({"table": "users", "record_id": "u2"})

    def test_unknown_targets_error(self):
        assert "Error" in mock_db_query.invoke({"table": "nope"})
        assert "Error" in update_db.invoke(
            {"table": "users", "record_id": "ghost", "data": {"a": 1}}
        )
        assert "Error" in delete_record.invoke({"table": "users", "record_id": "ghost"})


class TestWebSearch:
    def test_formats_results(self, monkeypatch):
        monkeypatch.setattr(
            tools,
            "DDGS",
            lambda: FakeDDGS(
                [{"title": "Cats", "href": "https://cats.example", "body": "Feline facts."}]
            ),
        )
        out = web_search.invoke({"query": "cats"})
        assert "1. Cats" in out and "https://cats.example" in out and "Feline facts." in out

    def test_no_results(self, monkeypatch):
        monkeypatch.setattr(tools, "DDGS", lambda: FakeDDGS([]))
        assert "No results" in web_search.invoke({"query": "nothing"})

    def test_network_error_degrades(self, monkeypatch):
        class Boom:
            def __init__(self):
                raise RuntimeError("offline")

        monkeypatch.setattr(tools, "DDGS", Boom)
        assert web_search.invoke({"query": "x"}).startswith("web_search error")

    def test_send_email_is_simulated(self):
        assert "[SIMULATED]" in send_email.invoke(
            {"to": "a@b.c", "subject": "s", "body": "b"}
        )


class TestWorkspaceJail:
    def test_write_outside_workspace_is_denied(self, monkeypatch, tmp_path):
        monkeypatch.setenv("AGENT_WORKSPACE", str(tmp_path / "ws"))
        escape = str(tmp_path / "secret.txt")
        out = tools.write_workspace_file.invoke({"file_path": escape, "content": "x"})
        assert "outside the workspace" in out
        assert not (tmp_path / "secret.txt").exists()

    def test_write_inside_workspace_succeeds(self, monkeypatch, tmp_path):
        ws = tmp_path / "ws"
        monkeypatch.setenv("AGENT_WORKSPACE", str(ws))
        out = tools.write_workspace_file.invoke({"file_path": "note.txt", "content": "hello"})
        assert "Successfully wrote" in out
        assert (ws / "note.txt").read_text() == "hello"

    def test_relative_traversal_is_denied(self, monkeypatch, tmp_path):
        monkeypatch.setenv("AGENT_WORKSPACE", str(tmp_path / "ws"))
        out = tools.read_workspace_file.invoke({"file_path": "../../etc/passwd"})
        assert "outside the workspace" in out

    def test_terminal_disabled_by_default(self):
        out = tools.run_terminal_command.invoke({"command": "echo hi"})
        assert "disabled" in out

    def test_terminal_enabled_via_allowlist(self, monkeypatch):
        monkeypatch.setenv("AGENT_TOOL_ALLOWLIST", "run_terminal_command")
        out = tools.run_terminal_command.invoke({"command": "echo hi"})
        assert out.strip() == "hi" or "successfully" in out.lower()
