import React from "react";
import { BotIcon } from "./Icons";

export function PlanSteps({ plan }: { plan: string | null }) {
  const steps = (plan ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+[.)]/.test(l))
    .map((l) => l.replace(/^\d+[.)]\s*/, ""));

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm font-sans">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line">
        <img src="/ice-bear-head.svg" alt="Bear" className="w-4 h-4 rounded-full object-contain" />
        <h2 className="text-xs font-bold text-ink">
          Action Plan
        </h2>
      </div>

      {steps.length === 0 ? (
        <div className="py-3 text-center">
          <p className="text-xs text-muted leading-relaxed">
            No active task. Friday will show its step-by-step plan here.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-ink/90">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-surface-2 border border-accent/30 text-accent text-[10px] shrink-0 font-bold font-mono">
                {i + 1}
              </span>
              <span className="leading-relaxed pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
