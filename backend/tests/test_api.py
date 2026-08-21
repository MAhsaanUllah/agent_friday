import uuid

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from api.main import app
from tests.stubs import install_script, tool_call_msg


@pytest.fixture()
def client():
    return TestClient(app)


def _plan() -> AIMessage:
    return AIMessage(content="1. Do it")


class TestHealth:
    def test_health_report_is_honest(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert "llm_configured" in body
        assert "mcp_servers" in body
        assert "auth_required" in body
        # mcp_servers reflects the real project-root config (3 servers).
        assert body["mcp_servers"] >= 1


class TestMcpStatus:
    def test_mcp_servers_listed(self, client):
        response = client.get("/mcp/servers")
        assert response.status_code == 200
        names = {s["name"] for s in response.json()}
        assert {"filesystem", "puppeteer", "sqlite"} <= names
        for s in response.json():
            assert s["status"] == "configured"
            assert s["type"] == "stdio"


class TestApiAuth:
    def test_open_mode_allows_requests_without_key(self, client):
        response = client.post("/agent/run", json={"message": "hi"})
        # 200 (completed) or 502 (no provider key in CI) - but NEVER 401.
        assert response.status_code != 401

    def test_enforced_mode_rejects_missing_key(self, client, monkeypatch):
        monkeypatch.setattr("api.security._REQUIRED", True)
        monkeypatch.setenv("AGENT_API_KEY", "secret-token")
        response = client.get("/mcp/servers")
        assert response.status_code == 401

    def test_enforced_mode_rejects_wrong_key(self, client, monkeypatch):
        monkeypatch.setattr("api.security._REQUIRED", True)
        monkeypatch.setenv("AGENT_API_KEY", "secret-token")
        response = client.post(
            "/agent/run", json={"message": "hi"}, headers={"X-API-Key": "wrong"}
        )
        assert response.status_code == 401

    def test_enforced_mode_accepts_valid_key(self, client, monkeypatch):
        monkeypatch.setattr("api.security._REQUIRED", True)
        monkeypatch.setenv("AGENT_API_KEY", "secret-token")
        # valid key, but no provider key in CI -> expect non-401 (502/200), not 401
        response = client.post(
            "/agent/run", json={"message": "hi"}, headers={"X-API-Key": "secret-token"}
        )
        assert response.status_code != 401


class TestRunEndpoint:
    def test_run_completed_with_safe_tool(self, client, monkeypatch):
        install_script(
            monkeypatch,
            [
                _plan(),
                tool_call_msg("math_calculator", {"expression": "6*7"}, "c1"),
                AIMessage(content="The answer is 42."),
            ],
        )
        response = client.post("/agent/run", json={"message": "what is 6 times 7"})
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "completed"
        assert body["thread_id"]
        assert body["plan"] == "1. Do it"
        roles = [m["role"] for m in body["messages"]]
        assert roles[0] == "user" and "assistant" in roles and "tool" in roles
        assert body["messages"][-1]["content"] == "The answer is 42."
        assert body["pending_tool_calls"] == []

    def test_run_awaiting_approval_for_unsafe_tool(self, client, monkeypatch):
        install_script(
            monkeypatch,
            [
                _plan(),
                tool_call_msg(
                    "delete_record", {"table": "users", "record_id": "u2"}, "c7"
                ),
            ],
        )
        response = client.post("/agent/run", json={"message": "purge user 2"})
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "awaiting_approval"
        assert len(body["pending_tool_calls"]) == 1
        assert body["pending_tool_calls"][0] == {
            "id": "c7",
            "name": "delete_record",
            "args": {"table": "users", "record_id": "u2"},
        }

    def test_run_rejects_empty_message(self, client):
        response = client.post("/agent/run", json={"message": ""})
        assert response.status_code == 422


class TestResumeEndpoint:
    def test_resume_approved_completes(self, client, monkeypatch):
        install_script(
            monkeypatch,
            [
                _plan(),
                tool_call_msg("send_email", {"to": "a@b.c", "subject": "s", "body": "b"}, "c9"),
            ],
        )
        run = client.post("/agent/run", json={"message": "email alice"}).json()
        assert run["status"] == "awaiting_approval"

        install_script(monkeypatch, [AIMessage(content="Email dispatched.")])
        response = client.post(
            "/agent/resume", json={"thread_id": run["thread_id"], "approved": True}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "completed"
        assert "[SIMULATED] Email sent to a@b.c" in "\n".join(
            m["content"] for m in body["messages"] if m["role"] == "tool"
        )
        assert body["pending_tool_calls"] == []

    def test_resume_denied_completes_without_execution(self, client, monkeypatch):
        install_script(
            monkeypatch,
            [
                _plan(),
                tool_call_msg("update_db", {"table": "tasks", "record_id": "t1", "data": {"status": "x"}}, "c3"),
            ],
        )
        run = client.post("/agent/run", json={"message": "mutate task"}).json()

        install_script(monkeypatch, [AIMessage(content="Skipping that action.")])
        response = client.post(
            "/agent/resume", json={"thread_id": run["thread_id"], "approved": False}
        )
        body = response.json()
        assert body["status"] == "completed"
        assert any("denied" in m["content"] for m in body["messages"] if m["role"] == "tool")

    def test_resume_without_interruption_conflicts(self, client):
        response = client.post(
            "/agent/resume", json={"thread_id": "no-such-thread", "approved": True}
        )
        assert response.status_code == 409


class TestEndToEndApprovalRoundTrip:
    def test_full_hitl_cycle_single_thread(self, client, monkeypatch):
        thread_id = f"e2e-{uuid.uuid4().hex}"
        install_script(
            monkeypatch,
            [
                _plan(),
                tool_call_msg("math_calculator", {"expression": "6*7"}, "cs"),
                tool_call_msg("delete_record", {"table": "users", "record_id": "u1"}, "cd"),
            ],
        )
        # First run: safe calculator executes, unsafe delete interrupts.
        first = client.post(
            "/agent/run", json={"message": "clean up", "thread_id": thread_id}
        ).json()
        assert first["status"] == "awaiting_approval"
        tool_contents = [m["content"] for m in first["messages"] if m["role"] == "tool"]
        assert any(c == "42" for c in tool_contents)
