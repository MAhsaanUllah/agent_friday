import React from "react";
import type { ToolCallView } from "../types";
import { RiskBadge } from "./RiskBadge";
import { AlertTriangleIcon, CheckIcon, XIcon } from "./Icons";

export function ApprovalCard({
  pending,
  busy,
  onApprove,
  onDeny,
}: {
  pending: ToolCallView[];
  busy: boolean;
  onApprove: () => void;
  onDeny: () => void;
}) {
  if (pending.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between border-b border-amber-500/30 px-4 py-3 bg-amber-500/15">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangleIcon className="w-4 h-4 animate-bounce" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider">
            Human Verification Required
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
          State Paused
        </span>
      </div>

      <div className="p-4 space-y-3.5">
        {pending.map((call) => (
          <div key={call.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-ink">
                Tool: <code className="text-amber-400">{call.name}</code>
              </span>
              <RiskBadge toolName={call.name} />
            </div>
            
            <div className="rounded-xl border border-line bg-black/50 p-3">
              <div className="text-[10px] font-mono text-muted mb-1 uppercase tracking-wider">
                Arguments Payload
              </div>
              <pre className="overflow-x-auto font-mono text-xs text-ink/90 leading-relaxed max-h-40">
                {JSON.stringify(call.args, null, 2)}
              </pre>
            </div>
          </div>
        ))}

        <p className="text-xs text-muted leading-relaxed">
          Agent Friday has halted execution at the <strong>Human Gate</strong>. Do you authorize this action?
        </p>

        <div className="flex gap-2.5 pt-1">
          <button
            onClick={onApprove}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white py-2.5 text-xs font-bold transition-all shadow-md shadow-emerald-900/30 disabled:opacity-40 cursor-pointer"
          >
            <CheckIcon className="w-4 h-4" />
            Approve & Execute
          </button>
          
          <button
            onClick={onDeny}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 active:scale-98 py-2.5 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
            Reject Action
          </button>
        </div>
      </div>
    </div>
  );
}
