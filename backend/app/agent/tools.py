import ast
import json
import operator
import os
import subprocess
import webbrowser
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from ddgs import DDGS
from langchain_core.tools import tool

# Tool Registry indicating if a tool is safe to execute without human approval

# --- Workspace jail -----------------------------------------------------------
# All file operations are confined to AGENT_WORKSPACE (default ./workspace).
# Paths that escape the jail (absolute paths outside it, or ".." traversal) are
# rejected, so the agent cannot touch the rest of the user's PC.

def _workspace_root() -> Path:
    return Path(os.getenv("AGENT_WORKSPACE", "workspace")).resolve()


def _safe_path(file_path: str) -> "Path | None":
    """Resolve file_path inside the workspace jail.

    Returns the resolved absolute Path if it stays within the workspace root,
    otherwise None (escape attempt -> deny access).
    """
    root = _workspace_root()
    root.mkdir(parents=True, exist_ok=True)
    candidate = Path(file_path)
    if not candidate.is_absolute():
        candidate = root / candidate
    candidate = candidate.resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    return candidate


TOOL_RISK_REGISTRY: Dict[str, Dict[str, Any]] = {
    "web_search": {"is_safe": True, "description": "Search the web for information."},
    "math_calculator": {"is_safe": True, "description": "Perform mathematical calculations."},
    "mock_db_query": {"is_safe": True, "description": "Query the mock database (read-only)."},
    "open_browser_url": {"is_safe": False, "description": "Open a website or video in the default browser (Edge/Chrome)."},
    "search_installed_apps": {"is_safe": True, "description": "Search for any installed Windows software or app by name."},
    "search_winget_packages": {"is_safe": True, "description": "Search installable software in Windows Package Manager repo."},
    "get_active_browser_windows": {"is_safe": True, "description": "Inspect and list titles of all currently open Chrome / Edge browser windows and web pages."},
    "chrome_live_search": {"is_safe": True, "description": "Perform live search directly inside user's active Chrome browser session."},
    "open_software_app": {"is_safe": False, "description": "Launch software on PC. Do NOT use this to open browsers for searching/URLs; use open_browser_url instead."},
    "install_windows_package": {"is_safe": False, "description": "Download & install software via Windows Package Manager (winget). High risk."},
    "read_workspace_file": {"is_safe": True, "description": "Read a file from the workspace folder."},
    "read_pdf_or_doc_file": {"is_safe": True, "description": "Extract readable text directly from any PDF, resume, or document file."},
    "create_pdf_document": {"is_safe": False, "description": "Generate and save a beautiful, formatted PDF report or document on user's PC."},
    "run_terminal_command": {"is_safe": False, "description": "Execute a shell or PowerShell command on the user's PC. High risk."},
    "write_workspace_file": {"is_safe": False, "description": "Create or modify a file in the workspace. High risk."},
    "send_email": {"is_safe": False, "description": "Send an email to a user. High risk."},
    "update_db": {"is_safe": False, "description": "Update records in the database. High risk."},
    "delete_record": {"is_safe": False, "description": "Delete a record from the database. High risk."}
}

# In-memory store backing the mock database tools.
_DB: Dict[str, Dict[str, Dict[str, Any]]] = {
    "users": {
        "u1": {"name": "Alice", "role": "admin", "email": "alice@example.com"},
        "u2": {"name": "Bob", "role": "member", "email": "bob@example.com"},
    },
    "tasks": {
        "t1": {"title": "Draft Q3 report", "status": "open", "owner": "u1"},
        "t2": {"title": "Ship v1.0 API", "status": "in_progress", "owner": "u2"},
    },
}


@tool
def web_search(query: str) -> str:
    """Search the web for the given query and return top results with URLs."""
    try:
        results = DDGS().text(query, max_results=5)
    except Exception as exc:
        return f"web_search error: {exc}"
    if not results:
        return f"No results found for '{query}'."
    lines = []
    for i, r in enumerate(results, 1):
        title = r.get("title", "")
        url = r.get("href") or r.get("url", "")
        snippet = r.get("body", "")
        lines.append(f"{i}. {title}\n   URL: {url}\n   {snippet}")
    return "\n\n".join(lines)


@tool
def open_browser_url(url: str, browser: Optional[str] = None) -> str:
    """Open a URL or website directly in the user's browser. If a specific browser (like 'edge' or 'chrome') is requested, specify it in the 'browser' argument."""
    import re
    
    # Fix common LLM typos
    url = url.replace("https//", "https://").replace("http//", "http://")
    
    # Extract the first http/https link if the LLM passes weird markdown artifacts
    match = re.search(r'(https?://[^\s"\'\]\)<>]+)', url)
    if match:
        clean_url = match.group(1)
    else:
        clean_url = url.strip(" \"'[](),\n")
        if not clean_url.startswith(("http://", "https://")):
            clean_url = "https://" + clean_url
            
    try:
        if browser:
            b_lower = browser.lower()
            if "edge" in b_lower:
                subprocess.Popen(["cmd", "/c", f"start msedge {clean_url}"])
                return f"Successfully opened {clean_url} specifically in Microsoft Edge."
            elif "chrome" in b_lower:
                subprocess.Popen(["cmd", "/c", f"start chrome {clean_url}"])
                return f"Successfully opened {clean_url} specifically in Google Chrome."
            elif "firefox" in b_lower:
                subprocess.Popen(["cmd", "/c", f"start firefox {clean_url}"])
                return f"Successfully opened {clean_url} specifically in Firefox."
        
        webbrowser.open(clean_url)
        return f"Successfully opened {clean_url} in your default browser."
    except Exception as exc:
        return f"Failed to open browser: {exc}"


@tool
def search_installed_apps(query: str = "") -> str:
    """Search all installed Windows applications, UWP Store apps, and Start Menu shortcuts."""
    if os.name != "nt":
        return "search_installed_apps is only supported on Windows OS."
    try:
        cmd = "Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Compress"
        res = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=10)
        if res.returncode == 0 and res.stdout.strip():
            raw = json.loads(res.stdout.strip())
            apps = raw if isinstance(raw, list) else [raw]
            if query:
                q = query.lower()
                matched = [a for a in apps if q in a.get("Name", "").lower() or q in a.get("AppID", "").lower()]
            else:
                matched = apps[:25]
            if matched:
                return "\n".join(f"- {a.get('Name')} (AppID: {a.get('AppID')})" for a in matched[:15])
            return f"No installed app found matching '{query}'."
        return "Unable to scan Windows StartApps."
    except Exception as exc:
        return f"Error scanning apps: {exc}"


@tool
def get_active_browser_windows() -> str:
    """Inspect and list the titles of all currently open and active Chrome / Edge / browser windows and tabs on your PC."""
    if os.name != "nt":
        return "Browser window inspection is configured for Windows OS."
    try:
        import ctypes
        from ctypes import wintypes
        user32 = ctypes.windll.user32
        all_titles = []

        def enum_handler(hwnd, lParam):
            if user32.IsWindowVisible(hwnd):
                length = user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buff = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd, buff, length + 1)
                    title = buff.value.strip()
                    if title:
                        all_titles.append(title)
            return True

        WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
        user32.EnumWindows(WNDENUMPROC(enum_handler), 0)

        # Filter for browser windows & active apps
        browser_keywords = ["chrome", "edge", "youtube", "google", "firefox", "brave", "opera", "chatgpt", "github", "localhost", "http"]
        browser_windows = []
        for t in all_titles:
            t_lower = t.lower()
            if any(k in t_lower for k in browser_keywords) or " - " in t:
                if t not in browser_windows and not t.startswith(("Default IME", "MSCTFIME", "Settings", "Program Manager")):
                    browser_windows.append(t)

        if browser_windows:
            lines = [f"{i+1}. {w}" for i, w in enumerate(browser_windows[:20])]
            return "Active Open Browser Windows & Tabs:\n" + "\n".join(lines)

        # General open window fallback
        valid_windows = [w for w in all_titles if len(w) > 2 and not w.startswith(("Default IME", "MSCTFIME", "Program Manager"))]
        if valid_windows:
            return "Open Desktop Windows:\n" + "\n".join(f"{i+1}. {w}" for i, w in enumerate(valid_windows[:15]))

        return "No visible browser windows found on desktop."
    except Exception as exc:
        return f"Error detecting active browser windows: {exc}"


@tool
def chrome_live_search(query: str) -> str:
    """Search Google or open a URL directly in your primary active Chrome browser."""
    import urllib.parse
    clean_q = query.strip()
    if clean_q.startswith(("http://", "https://")):
        url = clean_q
    else:
        url = f"https://www.google.com/search?q={urllib.parse.quote(clean_q)}"
    
    try:
        webbrowser.open(url)
        return f"Successfully opened search for '{clean_q}' in your primary Chrome browser ({url})."
    except Exception as exc:
        return f"Error opening search in Chrome: {exc}"


@tool
def search_winget_packages(query: str) -> str:
    """Search for installable Windows applications and packages using Windows Package Manager (winget)."""
    if os.name != "nt":
        return "Winget is only available on Windows OS."
    try:
        cmd = ["winget", "search", "--name", query, "--accept-source-agreements"]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        out = res.stdout.strip()
        if res.returncode == 0 and out:
            return out[:1500]
        return f"No winget package found for '{query}'."
    except Exception as exc:
        return f"Winget search error: {exc}"


@tool
def install_windows_package(package_id_or_name: str) -> str:
    """Safely install software or packages on Windows using winget (e.g. 'VideoLAN.VLC', '7zip.7zip', 'Git.Git').
    
    Opt-in only: requires AGENT_TOOL_ALLOWLIST to include 'install_windows_package'.
    """
    if os.name != "nt":
        return "Winget is only available on Windows OS."
    
    allowlist = [t.strip() for t in os.getenv("AGENT_TOOL_ALLOWLIST", "").split(",") if t.strip()]
    if "install_windows_package" not in allowlist:
        return (
            "Error: Software installation is disabled by default. Enable it explicitly with "
            "AGENT_TOOL_ALLOWLIST=install_windows_package to allow installing packages."
        )

    pkg = package_id_or_name.strip()
    try:
        cmd = [
            "winget", "install",
            "--id", pkg,
            "-e",
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--silent"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=240)
        out = res.stdout.strip()
        err = res.stderr.strip()
        if res.returncode == 0:
            return f"Successfully installed '{pkg}' on your PC via Windows Package Manager (winget)."
        
        # Fallback broader name install
        cmd_fallback = [
            "winget", "install",
            pkg,
            "--accept-package-agreements",
            "--accept-source-agreements"
        ]
        res_fb = subprocess.run(cmd_fallback, capture_output=True, text=True, timeout=240)
        if res_fb.returncode == 0:
            return f"Successfully installed '{pkg}' on your PC."
        return f"Installation output (code {res.returncode}):\n{err or out}"
    except subprocess.TimeoutExpired:
        return f"Installation of '{pkg}' timed out after 240 seconds."
    except Exception as exc:
        return f"Failed to install package: {exc}"


@tool
def open_software_app(app_name: str) -> str:
    """Intelligently search, locate, and launch any software application on the user's PC."""
    clean_app = app_name.strip()
    clean_lower = clean_app.lower()
    user_home = os.path.expanduser("~")

    # 1. Quick lookup for standard system tools
    quick_map = {
        "notepad": "notepad.exe",
        "calculator": "calc.exe",
        "calc": "calc.exe",
        "explorer": "explorer.exe",
        "file explorer": "explorer.exe",
        "vscode": "code",
        "vs code": "code",
        "cmd": "cmd.exe",
        "command prompt": "cmd.exe",
        "powershell": "powershell.exe",
        "terminal": "wt.exe",
        "chrome": "chrome.exe",
        "edge": "msedge.exe",
    }

    if clean_lower in quick_map:
        target = quick_map[clean_lower]
        try:
            if os.name == "nt":
                subprocess.Popen(f'start "" {target}', cwd=user_home, shell=True)
            else:
                subprocess.Popen(target, cwd=user_home, shell=True)
            return f"Successfully launched {app_name} on your PC."
        except Exception as exc:
            return f"Failed to launch {app_name}: {exc}"

    # 2. Windows StartApps & UWP Store App Deep Search
    if os.name == "nt":
        try:
            ps_cmd = "Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Compress"
            res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=8)
            if res.returncode == 0 and res.stdout.strip():
                raw = json.loads(res.stdout.strip())
                apps = raw if isinstance(raw, list) else [raw]
                for a in apps:
                    name = a.get("Name", "")
                    app_id = a.get("AppID", "")
                    if clean_lower == name.lower() or clean_lower in name.lower() or clean_lower in app_id.lower():
                        launch_cmd = f'start "" "shell:AppsFolder\\{app_id}"'
                        subprocess.Popen(launch_cmd, cwd=user_home, shell=True)
                        return f"Found and launched '{name}' (AppID: {app_id}) on your PC."
        except Exception:
            pass

        # 3. Search Desktop & Start Menu Shortcuts (.lnk files)
        search_dirs = [
            Path(user_home) / "Desktop",
            Path("C:/Users/Public/Desktop"),
            Path(user_home) / "AppData/Roaming/Microsoft/Windows/Start Menu/Programs",
            Path("C:/ProgramData/Microsoft/Windows/Start Menu/Programs"),
        ]
        for sdir in search_dirs:
            if sdir.exists():
                for lnk in sdir.rglob("*.lnk"):
                    if clean_lower in lnk.stem.lower():
                        subprocess.Popen(f'start "" "{str(lnk.resolve())}"', cwd=user_home, shell=True)
                        return f"Found shortcut '{lnk.name}' and launched {app_name} on your PC."

        # 4. Fallback: try raw start command
        try:
            subprocess.Popen(f'start "" "{clean_app}"', cwd=user_home, shell=True)
            return f"Executed system start for '{app_name}'."
        except Exception as exc:
            return f"Could not find or launch application '{app_name}'. Error: {exc}"

    return f"Unable to launch application '{app_name}' on this operating system."


@tool
def run_terminal_command(command: str) -> str:
    """Execute a PowerShell / CLI command on the user's PC and return the output.

    Opt-in only: requires AGENT_TOOL_ALLOWLIST to include 'run_terminal_command'.
    This is the highest-risk tool (full PC control), so it is disabled by default.
    """
    allowlist = [t.strip() for t in os.getenv("AGENT_TOOL_ALLOWLIST", "").split(",") if t.strip()]
    if "run_terminal_command" not in allowlist:
        return (
            "Error: Terminal access is disabled by default. Enable it explicitly with "
            "AGENT_TOOL_ALLOWLIST=run_terminal_command to allow shell execution."
        )
    try:
        res = subprocess.run(
            ["powershell", "-NoProfile", "-Command", command],
            capture_output=True,
            text=True,
            timeout=180,
            cwd=str(Path.cwd())
        )
        out = res.stdout.strip()
        err = res.stderr.strip()
        if res.returncode == 0:
            return out if out else "(Command executed successfully with no stdout output)"
        return f"Command exited with code {res.returncode}:\n{err or out}"
    except subprocess.TimeoutExpired:
        return "Command timed out after 180 seconds."
    except Exception as exc:
        return f"Command execution failed: {exc}"


@tool
def read_workspace_file(file_path: str) -> str:
    """Read content of a file within the workspace folder (jailed)."""
    p = _safe_path(file_path)
    if p is None:
        return f"Error: '{file_path}' is outside the workspace. Access denied."
    if not p.exists():
        return f"Error: File '{file_path}' does not exist."
    try:
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            return f.read(5000)
    except Exception as exc:
        return f"Error reading file: {exc}"


@tool
def read_pdf_or_doc_file(file_path: str) -> str:
    """Extract clean readable text from a PDF/document inside the workspace (jailed)."""
    p = _safe_path(file_path)
    if p is None or not p.exists():
        # Convenience fallback: the app-owned uploads folder (not arbitrary FS).
        uploads_p = (Path(".friday") / "uploads" / Path(file_path).name).resolve()
        try:
            uploads_p.relative_to(Path(".friday").resolve())
        except ValueError:
            uploads_p = Path("")
        if uploads_p and uploads_p.exists():
            p = uploads_p
        else:
            return f"File not found: '{file_path}'."
    
    try:
        with open(p, "rb") as f:
            raw_bytes = f.read()
    except Exception as exc:
        return f"Failed to open file: {exc}"

    # Try PDF decoding
    try:
        import zlib
        import re
        extracted = []
        stream_pattern = re.compile(b"stream[\r\n]+(.*?)[\r\n]+endstream", re.DOTALL)
        for match in stream_pattern.finditer(raw_bytes):
            stream_data = match.group(1)
            decompressed = None
            for wbits in [0, -zlib.MAX_WBITS, zlib.MAX_WBITS]:
                try:
                    decompressed = zlib.decompress(stream_data, wbits)
                    break
                except Exception:
                    continue
            if not decompressed:
                decompressed = stream_data

            tj_matches = re.findall(b"\((.*?)\)\s*Tj", decompressed)
            for tj in tj_matches:
                try:
                    t = tj.decode("utf-8", errors="ignore").strip()
                    if len(t) > 1 or t.isalnum():
                        extracted.append(t)
                except Exception:
                    pass

            tj_arrays = re.findall(b"\[(.*?)\]\s*TJ", decompressed)
            for tja in tj_arrays:
                parts = re.findall(b"\((.*?)\)", tja)
                line = "".join(p.decode("utf-8", errors="ignore") for p in parts).strip()
                if line:
                    extracted.append(line)

        if extracted:
            return "\n".join(extracted[:500])
    except Exception:
        pass

    return raw_bytes.decode("utf-8", errors="ignore")[:5000]


@tool
def write_workspace_file(file_path: str, content: str) -> str:
    """Create or overwrite a file in the workspace (jailed)."""
    p = _safe_path(file_path)
    if p is None:
        return f"Error: '{file_path}' is outside the workspace. Write denied."
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Successfully wrote {len(content)} bytes to {file_path}."
    except Exception as exc:
        return f"Error writing file: {exc}"


@tool
def create_pdf_document(file_name: str, title: str, content: str) -> str:
    """Generate a clean, professionally-formatted PDF document or report on the user's PC."""
    clean_name = file_name.strip()
    if not clean_name.lower().endswith(".pdf"):
        clean_name += ".pdf"

    output_dir = _workspace_root() / "generated_reports"
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / clean_name
    html_path = output_dir / f"{clean_name}.html"
    # Guard against traversal in the supplied file name.
    if not str(pdf_path.resolve()).startswith(str(output_dir.resolve())):
        return f"Error: invalid file name '{file_name}'."

    import html
    styled_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{html.escape(title)}</title>
<style>
  body {{
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    margin: 40px;
    color: #1e293b;
    line-height: 1.6;
    background: #ffffff;
  }}
  h1 {{
    color: #0f172a;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 8px;
    font-size: 22px;
    margin-bottom: 6px;
  }}
  .meta {{
    font-size: 11px;
    color: #64748b;
    margin-bottom: 24px;
  }}
  .content {{
    font-size: 13.5px;
    white-space: pre-wrap;
    word-break: break-word;
  }}
  .footer {{
    margin-top: 40px;
    border-top: 1px solid #e2e8f0;
    padding-top: 10px;
    font-size: 11px;
    color: #94a3b8;
    text-align: right;
  }}
</style>
</head>
<body>
  <h1>{html.escape(title)}</h1>
  <div class="meta">Generated by Agent Friday • {Path(pdf_path).name}</div>
  <div class="content">{html.escape(content)}</div>
  <div class="footer">Agent Friday Autonomous Desktop System</div>
</body>
</html>"""

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(styled_html)

    # Windows Edge / Chrome headless print
    browsers = [
        Path(os.environ.get("PROGRAMFILES(X86)", "C:/Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Microsoft/Edge/Application/msedge.exe",
        Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Google/Chrome/Application/chrome.exe",
    ]
    target_browser = next((str(b) for b in browsers if b.exists()), "msedge.exe")

    try:
        cmd = [
            target_browser,
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={str(pdf_path.resolve())}",
            str(html_path.resolve()),
        ]
        subprocess.run(cmd, capture_output=True, timeout=15)
        if pdf_path.exists():
            return f"Successfully created PDF document: '{pdf_path.name}' at {str(pdf_path.resolve())}."
        return f"Created HTML report at {str(html_path.resolve())} (PDF conversion fallback)."
    except Exception as exc:
        return f"Created report HTML at {str(html_path.resolve())}. Note: {exc}"


_ALLOWED_BINOPS: Dict[type, Callable[[Any, Any], Any]] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_ALLOWED_UNARYOPS: Dict[type, Callable[[Any], Any]] = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}


def _safe_eval_node(node: ast.AST) -> float:
    if isinstance(node, ast.Expression):
        return _safe_eval_node(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
        return _ALLOWED_BINOPS[type(node.op)](_safe_eval_node(node.left), _safe_eval_node(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARYOPS:
        return _ALLOWED_UNARYOPS[type(node.op)](_safe_eval_node(node.operand))
    raise ValueError(f"Unsupported expression element: {ast.dump(node)}")


@tool
def math_calculator(expression: str) -> str:
    """Evaluate an arithmetic expression (numbers, + - * / // % **, parentheses)."""
    try:
        tree = ast.parse(expression, mode="eval")
        result = _safe_eval_node(tree)
        return str(result)
    except Exception as exc:
        return f"Error: {exc}"


@tool
def mock_db_query(table: str, record_id: str = "") -> str:
    """Read rows from the mock database. Pass table only for all rows, or table + record_id."""
    rows = _DB.get(table)
    if rows is None:
        return f"Error: unknown table '{table}'. Available: {', '.join(sorted(_DB))}."
    if record_id:
        row = rows.get(record_id)
        if row is None:
            return f"Error: no record '{record_id}' in '{table}'."
        return json.dumps({record_id: row})
    return json.dumps(rows)


@tool
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email. [SIMULATED - no SMTP transport configured.]"""
    return f"[SIMULATED] Email sent to {to} | subject='{subject}' | body={len(body)} chars"


@tool
def update_db(table: str, record_id: str, data: Dict[str, Any]) -> str:
    """Merge data fields into an existing record identified by table + record_id."""
    rows = _DB.get(table)
    if rows is None:
        return f"Error: unknown table '{table}'."
    if record_id not in rows:
        return f"Error: no record '{record_id}' in '{table}'."
    rows[record_id].update(data)
    return f"Updated {table}/{record_id}: {json.dumps(rows[record_id])}"


@tool
def delete_record(table: str, record_id: str) -> str:
    """Delete a record from the database by table + record_id."""
    rows = _DB.get(table)
    if rows is None or record_id not in rows:
        return f"Error: no record '{record_id}' in '{table}'."
    del rows[record_id]
    return f"Deleted record {record_id} from {table}."


# List of all tools available to the agent
AVAILABLE_TOOLS = [
    web_search,
    open_browser_url,
    get_active_browser_windows,
    chrome_live_search,
    search_installed_apps,
    search_winget_packages,
    open_software_app,
    install_windows_package,
    run_terminal_command,
    read_workspace_file,
    read_pdf_or_doc_file,
    write_workspace_file,
    create_pdf_document,
    math_calculator,
    mock_db_query,
    send_email,
    update_db,
    delete_record
]

def is_tool_safe(tool_name: str) -> bool:
    """Check if a tool is safe to execute automatically."""
    return bool(TOOL_RISK_REGISTRY.get(tool_name, {}).get("is_safe", False))
