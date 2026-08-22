export type Role = "user" | "assistant" | "tool";

export interface MessageView {
  role: Role;
  content: string;
  timestamp?: string;
}

export interface ToolCallView {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export type AgentStatus = "completed" | "awaiting_approval";

export interface AgentResponse {
  thread_id: string;
  status: AgentStatus;
  plan: string | null;
  messages: MessageView[];
  pending_tool_calls: ToolCallView[];
}

/** Mirror of backend TOOL_RISK_REGISTRY (name -> safe without approval). */
export const TOOL_RISK: Record<string, boolean> = {
  web_search: true,
  math_calculator: true,
  mock_db_query: true,
  open_browser_url: true,
  search_installed_apps: true,
  search_winget_packages: true,
  read_workspace_file: true,
  open_software_app: false,
  install_windows_package: false,
  run_terminal_command: false,
  write_workspace_file: false,
  send_email: false,
  update_db: false,
  delete_record: false,
};

export function isToolSafe(name: string): boolean {
  return TOOL_RISK[name] ?? false;
}
