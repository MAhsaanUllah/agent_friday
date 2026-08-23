import React, { useState } from "react";
import { CalculatorIcon, DatabaseIcon, MailIcon, SearchIcon, ShieldIcon, TerminalIcon } from "./Icons";

interface ToolInfo {
  name: string;
  isSafe: boolean;
  category: string;
  description: string;
  icon: React.ReactNode;
}

const TOOLS: ToolInfo[] = [
  {
    name: "web_search",
    isSafe: true,
    category: "Search",
    description: "Search the web for up-to-date information",
    icon: <SearchIcon className="w-4 h-4" />,
  },
  {
    name: "open_browser_url",
    isSafe: true,
    category: "Browser",
    description: "Open YouTube or websites in your browser",
    icon: <SearchIcon className="w-4 h-4" />,
  },
  {
    name: "chrome_live_search",
    isSafe: true,
    category: "Browser",
    description: "Search in your active Google Chrome",
    icon: <SearchIcon className="w-4 h-4" />,
  },
  {
    name: "get_active_browser_windows",
    isSafe: true,
    category: "Windows OS",
    description: "List all active open browser windows and tabs",
    icon: <SearchIcon className="w-4 h-4" />,
  },
  {
    name: "create_pdf_document",
    isSafe: true,
    category: "PDF Generator",
    description: "Generate beautiful PDF reports on your PC",
    icon: <DatabaseIcon className="w-4 h-4" />,
  },
  {
    name: "read_pdf_or_doc_file",
    isSafe: true,
    category: "Files",
    description: "Extract clean text from PDF/docs",
    icon: <DatabaseIcon className="w-4 h-4" />,
  },
  {
    name: "search_installed_apps",
    isSafe: true,
    category: "PC Control",
    description: "Find installed software and shortcuts",
    icon: <SearchIcon className="w-4 h-4" />,
  },
  {
    name: "search_winget_packages",
    isSafe: true,
    category: "Apps",
    description: "Search Windows app store repository",
    icon: <SearchIcon className="w-4 h-4" />,
  },
  {
    name: "open_software_app",
    isSafe: false,
    category: "PC Control",
    description: "Open apps (Notepad, Calculator, Chrome)",
    icon: <TerminalIcon className="w-4 h-4" />,
  },
  {
    name: "install_windows_package",
    isSafe: false,
    category: "Apps",
    description: "Download & install software (Winget)",
    icon: <TerminalIcon className="w-4 h-4" />,
  },
  {
    name: "run_terminal_command",
    isSafe: false,
    category: "Terminal",
    description: "Run custom shell & script commands",
    icon: <TerminalIcon className="w-4 h-4" />,
  },
  {
    name: "read_workspace_file",
    isSafe: true,
    category: "Files",
    description: "Read documents from your workspace",
    icon: <DatabaseIcon className="w-4 h-4" />,
  },
  {
    name: "write_workspace_file",
    isSafe: false,
    category: "Files",
    description: "Create or save files in workspace",
    icon: <DatabaseIcon className="w-4 h-4" />,
  },
  {
    name: "math_calculator",
    isSafe: true,
    category: "Math",
    description: "Calculate math formulas and numbers",
    icon: <CalculatorIcon className="w-4 h-4" />,
  },
  {
    name: "mock_db_query",
    isSafe: true,
    category: "Data",
    description: "Read database records and tables",
    icon: <DatabaseIcon className="w-4 h-4" />,
  },
  {
    name: "update_db",
    isSafe: false,
    category: "Data",
    description: "Update database records",
    icon: <DatabaseIcon className="w-4 h-4" />,
  },
  {
    name: "delete_record",
    isSafe: false,
    category: "Data",
    description: "Remove records from database",
    icon: <DatabaseIcon className="w-4 h-4" />,
  },
  {
    name: "send_email",
    isSafe: false,
    category: "Email",
    description: "Send outbound emails",
    icon: <MailIcon className="w-4 h-4" />,
  },
];

export function ToolRegistryCard() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 font-sans shadow-sm">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <ShieldIcon className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-bold text-ink">
            What Friday Can Do ({TOOLS.length})
          </h3>
        </div>
        <span className="text-[11px] text-muted hover:text-ink">
          {collapsed ? "Show" : "Hide"}
        </span>
      </div>

      {!collapsed && (
        <div className="mt-3 flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
          {TOOLS.map((t) => (
            <div
              key={t.name}
              className="flex items-center justify-between p-2 rounded-xl bg-surface-2 border border-line/40 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted">{t.icon}</span>
                <div className="min-w-0">
                  <div className="font-medium text-ink truncate text-xs">
                    {t.name}
                  </div>
                  <div className="text-[10px] text-muted truncate">
                    {t.description}
                  </div>
                </div>
              </div>
              <span
                className={`text-[9.5px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                  t.isSafe
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {t.isSafe ? "Auto" : "Needs Approval"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
