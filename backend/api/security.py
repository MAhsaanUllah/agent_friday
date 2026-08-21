"""Simple bearer-style API key gate for the Agent Friday server.

Enforced only when AGENT_API_KEY is set in the environment. When unset the
server runs in open/dev mode (logs a warning) so local development is
unobstructed. Provider keys (Gemini/DeepSeek/etc.) MUST come from the server
.env, never from a client request.
"""

import logging
import os

from fastapi import Header, HTTPException

logger = logging.getLogger("agent.friday")

# Evaluated at import time, after load_dotenv() runs in main.py.
_REQUIRED = bool(os.getenv("AGENT_API_KEY"))


def require_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    """FastAPI dependency that 401s when the key is missing/invalid.

    No-op in open/dev mode (AGENT_API_KEY unset).
    """
    if not _REQUIRED:
        logger.warning("AGENT_API_KEY not set - API running in OPEN mode (no auth).")
        return
    expected = os.getenv("AGENT_API_KEY", "")
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
