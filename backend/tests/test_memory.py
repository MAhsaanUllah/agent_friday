"""Tests for the local persistent memory engine."""

import json

import pytest

from app.agent import memory


@pytest.fixture()
def temp_memory(tmp_path, monkeypatch):
    mem_dir = tmp_path / ".friday"
    monkeypatch.setattr(memory, "MEMORY_DIR", mem_dir)
    monkeypatch.setattr(memory, "MEMORY_FILE", mem_dir / "memory.json")
    return mem_dir


class TestMemoryLoad:
    def test_defaults_seeded_on_first_load(self, temp_memory):
        data = memory.get_local_memory()
        assert data["project_context"]["project_name"] == "Agent Friday"
        assert isinstance(data["user_preferences"], list)
        assert (temp_memory / "memory.json").exists()

    def test_corrupt_file_falls_back_to_defaults(self, temp_memory):
        temp_memory.mkdir(parents=True, exist_ok=True)
        (temp_memory / "memory.json").write_text("{broken", encoding="utf-8")
        data = memory.get_local_memory()
        # Corrupt JSON must not crash; defaults are returned.
        assert data["project_context"]["project_name"] == "Agent Friday"


class TestMemoryWrites:
    def test_append_learned_fact_persists(self, temp_memory):
        memory.append_learned_fact("User prefers short replies")
        saved = json.loads((temp_memory / "memory.json").read_text(encoding="utf-8"))
        assert "User prefers short replies" in saved["learned_facts"]

    def test_append_learned_fact_dedupes(self, temp_memory):
        memory.append_learned_fact("dup")
        memory.append_learned_fact("dup")
        saved = json.loads((temp_memory / "memory.json").read_text(encoding="utf-8"))
        assert saved["learned_facts"].count("dup") == 1

    def test_append_recent_task_keeps_last_20(self, temp_memory):
        for i in range(25):
            memory.append_recent_task(f"task-{i}")
        saved = json.loads((temp_memory / "memory.json").read_text(encoding="utf-8"))
        assert len(saved["recent_tasks"]) == 20
        assert saved["recent_tasks"][-1] == "task-24"

    def test_context_string_includes_preferences(self, temp_memory):
        ctx = memory.get_memory_context_string()
        assert "User Preferences" in ctx
        # Default memory always seeds a known preference (design identity).
        assert "Tony Stark" in ctx
