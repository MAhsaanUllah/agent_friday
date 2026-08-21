"""Run the Agent Friday API from the repo root.

Usage:
    python run_backend.py [--port 8000] [--reload]
"""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import uvicorn  # noqa: E402


def main() -> None:
    port = 8000
    reload = False
    args = sys.argv[1:]
    if "--port" in args:
        port = int(args[args.index("--port") + 1])
    if "--reload" in args:
        reload = True
    uvicorn.run("api.main:app", host="127.0.0.1", port=port, reload=reload)


if __name__ == "__main__":
    main()
