import React, { useEffect, useRef } from "react";
import type { MessageView, ToolCallView } from "../types";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { HeroPrompts } from "./HeroPrompts";
import { BotIcon, AlertTriangleIcon, CheckIcon, XIcon } from "./Icons";
import { RiskBadge } from "./RiskBadge";


interface ChatPanelProps {
  messages: MessageView[];
  busy: boolean;
  awaitingApproval: boolean;
  pending?: ToolCallView[];
  progress?: string[];
  onApprove?: () => void;
  onDeny?: () => void;
  onStop?: () => void;
  onSubmit: (text: string) => void;
}

export function ChatPanel({
  messages,
  busy,
  awaitingApproval,
  pending = [],
  progress = [],
  onApprove,
  onDeny,
  onStop,
  onSubmit,
}: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, busy, awaitingApproval]);

  // Keyboard shortcuts when awaiting approval: Ctrl+Enter to Approve, Esc to Reject
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!awaitingApproval || busy) return;
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onApprove?.();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDeny?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [awaitingApproval, busy, onApprove, onDeny]);

  const currentPending = pending[0];
  const activeProgress = progress.length > 0 ? progress.slice(-1)[0] : undefined;

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-surface/50 backdrop-blur-sm overflow-hidden shadow-sm font-sans">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 md:p-4 flex flex-col justify-start">
        {messages.length === 0 ? (
          <HeroPrompts onSelectPrompt={onSubmit} />
        ) : (
          messages.map((m, i) => <MessageBubble key={i} message={m} />)
        )}

        {busy && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs w-full max-w-lg animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <BotIcon className="w-4 h-4 animate-spin shrink-0" />
              <span className="truncate font-medium">
                {progress.length > 0
                  ? `Friday is working: ${progress.slice(-2).join(" → ")}…`
                  : "Friday is thinking and running tools..."}
              </span>
            </div>
            {onStop && (
              <button
                type="button"
                onClick={onStop}
                title="Immediately stop Friday's current execution"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <span>🛑</span>
                <span>STOP</span>
              </button>
            )}
          </div>
        )}

        <div ref={endRef} />
      </div>


      {/* Centered Modal for Approvals */}
      {awaitingApproval && currentPending && !busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-5 animate-in zoom-in-95 duration-300 flex flex-col relative overflow-hidden">
            {/* Subtle top glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-amber-500/10 blur-[40px] rounded-full pointer-events-none" />
            
            <div className="flex items-start gap-3 relative z-10">
               <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/5 text-amber-400 border border-amber-500/20 shrink-0 shadow-inner">
                 <AlertTriangleIcon className="w-5 h-5" />
               </div>
               <div className="pt-0.5">
                  <h3 className="text-[15px] font-bold text-ink leading-tight">Action Requires Approval</h3>
                  <p className="text-[12px] text-muted font-medium mt-1 leading-relaxed pr-2">
                    Friday wants to run <strong className="text-amber-400/90 font-mono px-1 bg-amber-500/10 rounded">{currentPending.name}</strong>. Please review the payload below.
                  </p>
               </div>
            </div>
            
            <div className="mt-4 p-3.5 bg-[#0a0a0a] rounded-xl border border-white/5 shadow-inner relative z-10">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Execution Payload</span>
                <RiskBadge toolName={currentPending.name} />
              </div>
              <div className="text-[11px] font-mono text-emerald-400/90 whitespace-pre-wrap max-h-[160px] overflow-y-auto custom-scrollbar leading-relaxed">
                {JSON.stringify(currentPending.args, null, 2)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-1 relative z-10">
              <button
                onClick={onDeny}
                className="px-4 py-2 rounded-lg text-muted hover:text-ink hover:bg-white/5 transition-all font-medium text-xs flex items-center gap-1.5"
              >
                Cancel
              </button>
              <button
                onClick={onApprove}
                className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-black font-bold text-xs shadow-[0_0_15px_rgba(var(--color-accent),0.4)] transition-all active:scale-95 flex items-center gap-1.5"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Allow Execution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Area */}
      <div className="p-3 md:p-4 border-t border-line bg-surface/90 backdrop-blur-md shrink-0 relative z-10">
        <Composer
          disabled={busy}
          onSubmit={onSubmit}
        />
      </div>
    </section>
  );
}
