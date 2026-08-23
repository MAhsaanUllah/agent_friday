import React, { useEffect } from "react";
import type { ToolCallView } from "../types";
import { AlertTriangleIcon, CheckIcon, XIcon, ShieldIcon } from "./Icons";

interface FloatingApprovalBarProps {
  pending: ToolCallView[];
  busy: boolean;
  onApprove: () => void;
  onDeny: () => void;
}

export function FloatingApprovalBar({
  pending,
  busy,
  onApprove,
  onDeny,
}: FloatingApprovalBarProps) {
  if (pending.length === 0) return null;

  const current = pending[0]!;

  // Global Keyboard shortcuts: Enter to Approve, Esc to Reject
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onApprove();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDeny();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onApprove, onDeny]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-3xl animate-in slide-in-from-bottom-6 fade-in duration-300">
      <div className="rounded-2xl border-2 border-amber-500/80 bg-surface/95 backdrop-blur-2xl shadow-[0_0_40px_rgba(245,158,11,0.35)] p-3 md:p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Indicator & Tool Info */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <AlertTriangleIcon className="w-5 h-5 animate-bounce" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 uppercase">
                Human Gate Active
              </span>
              <span className="font-mono text-xs font-bold text-ink truncate">
                Action: <span className="text-amber-400 font-mono">{current.name}</span>
              </span>
            </div>
            <p className="text-[11px] text-muted truncate max-w-md mt-0.5 font-mono">
              Payload: {JSON.stringify(current.args)}
            </p>
          </div>
        </div>

        {/* Right: Action Buttons (Approve / Reject) */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={onDeny}
            disabled={busy}
            title="Press Esc to Reject"
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/50 active:scale-95 text-xs font-bold font-mono transition-all cursor-pointer disabled:opacity-40"
          >
            <XIcon className="w-4 h-4" />
            <span>Reject (Esc)</span>
          </button>

          <button
            onClick={onApprove}
            disabled={busy}
            title="Press Ctrl+Enter to Approve"
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold font-mono text-xs transition-all shadow-lg shadow-emerald-900/40 cursor-pointer disabled:opacity-40 hud-glow-amber"
          >
            <CheckIcon className="w-4 h-4 text-white" />
            <span>Approve & Execute</span>
          </button>
        </div>
      </div>
    </div>
  );
}
