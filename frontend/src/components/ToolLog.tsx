import React from "react";
import { TerminalIcon } from "./Icons";
import type { MessageView } from "../types";

export function ToolLog({ messages }: { messages: MessageView[] }) {
  const toolEvents = messages.filter((m) => m.role === "tool");

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm font-sans">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-line">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold text-ink">
            Action History
          </h2>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-line text-muted">
          {toolEvents.length} actions
        </span>
      </div>

      {toolEvents.length === 0 ? (
        <div className="py-3 text-center">
          <p className="text-xs text-muted leading-relaxed">No actions performed yet.</p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {toolEvents.map((m, i) => (
            <li
              key={i}
              className="rounded-xl border border-line/60 bg-surface-2 p-2.5 text-xs text-ink/85 shadow-xs"
            >
              <div className="flex items-center justify-between text-muted text-[10px] mb-1">
                <span className="text-amber-400 font-semibold">Action #{i + 1}</span>
                <span>{m.timestamp}</span>
              </div>
              <p className="line-clamp-3 text-ink/90 whitespace-pre-wrap break-words font-mono text-[11px]">
                {m.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
