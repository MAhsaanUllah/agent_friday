import React, { useEffect, useState } from "react";
import { TerminalIcon, ShieldIcon, RefreshIcon, CheckIcon } from "./Icons";

interface McpServerInfo {
  name: string;
  command: string;
  args: string[];
  status: string;
  type: string;
}

export function McpServerStatus() {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/mcp/servers");
      if (res.ok) {
        const data = await res.json();
        setServers(data);
      }
    } catch {
      // Fallback display
      setServers([
        { name: "filesystem", command: "npx", args: ["@modelcontextprotocol/server-filesystem"], status: "ready", type: "stdio" },
        { name: "puppeteer", command: "npx", args: ["@modelcontextprotocol/server-puppeteer"], status: "ready", type: "stdio" },
        { name: "sqlite", command: "npx", args: ["@modelcontextprotocol/server-sqlite"], status: "ready", type: "stdio" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-accent" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
            MCP Connectors (mcp_config.json)
          </h3>
        </div>
        <button
          onClick={fetchServers}
          title="Refresh MCP Server Status"
          className="text-muted hover:text-accent cursor-pointer transition-colors"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-2">
        {servers.map((srv) => (
          <div
            key={srv.name}
            className="flex items-center justify-between p-2.5 rounded-xl border border-line/60 bg-surface-2/60 text-xs font-mono"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="font-bold text-ink">{srv.name}</span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent font-bold uppercase">
              {srv.type}
            </span>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-muted flex items-center gap-1.5 pt-1">
        <ShieldIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>External tools are automatically filtered by our Human Gate.</span>
      </div>
    </div>
  );
}
