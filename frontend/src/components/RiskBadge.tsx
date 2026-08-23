import React from "react";
import { isToolSafe } from "../types";

export function RiskBadge({ toolName }: { toolName: string }) {
  const safe = isToolSafe(toolName);
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-widest border uppercase ${
        safe
          ? "bg-accent/10 text-accent border-accent/30"
          : "bg-amber-500/15 text-amber-400 border-amber-500/40"
      }`}
    >
      {safe ? "SAFE // AUTO" : "RISKY // GATED"}
    </span>
  );
}
