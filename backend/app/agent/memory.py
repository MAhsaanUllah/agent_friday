"""Local Persistent Memory Engine for Agent Friday.

Stores user preferences, project context, and factual memories in a local JSON file
on the user's PC (.friday/memory.json). Zero cloud storage.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, List

# Resolve against the project root so the store is shared regardless of CWD.
MEMORY_DIR = Path(__file__).resolve().parents[3] / ".friday"
MEMORY_FILE = MEMORY_DIR / "memory.json"

DEFAULT_MEMORY: Dict[str, Any] = {
    "user_preferences": [
        "Prefers dark high-contrast Tony Stark / F.R.I.D.A.Y. HUD theme",
        "Stack: React 19, TypeScript, FastAPI, Python 3.11, LangGraph",
        "Enforce strict human-in-the-loop gating on destructive operations",
    ],
    "project_context": {
        "project_name": "Agent Friday",
        "type": "Autonomous HITL Agent",
        "workspace": str(Path.cwd().resolve()),
    },
    "learned_facts": [],
    "recent_tasks": [],
}


def _ensure_memory_exists() -> Dict[str, Any]:
    """Ensures the .friday/memory.json file exists on the user's PC."""
    try:
        MEMORY_DIR.mkdir(parents=True, exist_ok=True)
        if not MEMORY_FILE.exists():
            with open(MEMORY_FILE, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_MEMORY, f, indent=2)
            return DEFAULT_MEMORY.copy()
        
        with open(MEMORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return DEFAULT_MEMORY.copy()


def get_local_memory() -> Dict[str, Any]:
    """Read long-term persistent memory from the local PC folder."""
    return _ensure_memory_exists()


def get_memory_context_string() -> str:
    """Format memory into a concise context block for the LLM system prompt."""
    mem = get_local_memory()
    prefs = "\n".join(f"- {p}" for p in mem.get("user_preferences", []))
    facts = "\n".join(f"- {f}" for f in mem.get("learned_facts", []))
    tasks = "\n".join(f"- {t}" for t in mem.get("recent_tasks", [])[-5:])

    context = f"""
[LOCAL PERSISTENT MEMORY (Loaded from PC: .friday/memory.json)]
User Preferences:
{prefs if prefs else "None recorded."}

Learned Project Facts:
{facts if facts else "None recorded."}

Recent Completed Missions:
{tasks if tasks else "None recorded."}
"""
    return context.strip()


def append_learned_fact(fact: str) -> None:
    """Save a new learned fact or task into local memory."""
    mem = _ensure_memory_exists()
    facts = mem.setdefault("learned_facts", [])
    if fact not in facts:
        facts.append(fact)
    try:
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump(mem, f, indent=2)
    except Exception:
        pass


def append_recent_task(task_summary: str) -> None:
    """Record a completed mission into local memory."""
    mem = _ensure_memory_exists()
    tasks = mem.setdefault("recent_tasks", [])
    tasks.append(task_summary)
    # Keep last 20 tasks
    mem["recent_tasks"] = tasks[-20:]
    try:
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump(mem, f, indent=2)
    except Exception:
        pass
