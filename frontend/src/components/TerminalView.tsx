import React, { useEffect, useRef } from "react";
import type { MessageView } from "../types";
import type { Phase } from "../hooks/useAgent";
import { TerminalIcon, ShieldIcon, BotIcon, CheckIcon } from "./Icons";

interface TerminalViewProps {
  messages: MessageView[];
  phase: Phase;
  plan: string | null;
  online: boolean;
}

export function TerminalView({ messages, phase, plan, online }: TerminalViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, phase]);

  const toolEvents = messages.filter((m) => m.role === "tool");

  return (
    <div className="flex flex-col h-full rounded-2xl border border-line bg-black/90 font-mono text-xs shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2/90 border-b border-line select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[11px] font-bold text-muted ml-2 flex items-center gap-1.5">
            <TerminalIcon className="w-3.5 h-3.5 text-accent" />
            FRIDAY-RUNTIME // TTY-1
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted">
          <button
            onClick={() => {
              const text = messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n');
              navigator.clipboard.writeText(text);
            }}
            className="flex items-center gap-1 hover:text-ink cursor-pointer bg-surface/50 px-2 py-1 rounded border border-line transition-colors"
            title="Copy all logs"
          >
            <CheckIcon className="w-3 h-3" /> Copy Logs
          </button>
          <span>STATUS: <strong className={online ? "text-emerald-400" : "text-rose-400"}>{online ? "CORE ACTIVE" : "DISCONNECTED"}</strong></span>
          <span>PHASE: <strong className="text-accent uppercase">{phase}</strong></span>
        </div>
      </div>

      {/* Terminal Content Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-[11px] text-ink/85 leading-relaxed">
        <div className="text-muted/60">
          [SYSTEM INITIALIZED] LangGraph Deterministic State Machine v1.0<br />
          [PRIVACY PROTOCOL] Zero server data retention. Ephemeral client session.<br />
          [SECURITY GATE] Safety routing active: interrupt_before=["human_gate"]<br />
          --------------------------------------------------------------------------------
        </div>

        {plan && (
          <div className="p-2.5 rounded-lg bg-surface/80 border border-accent/30 text-accent">
            <div className="text-[10px] text-accent/70 font-bold uppercase mb-1 flex items-center gap-1">
              <BotIcon className="w-3 h-3" />
              [PLANNER OUTPUT]
            </div>
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-ink/90">{plan}</pre>
          </div>
        )}

        {messages.map((m, idx) => {
          if (m.role === "user") {
            return (
              <div key={idx} className="text-cyan-300">
                <span className="text-muted font-bold">[USER_INPUT]&gt; </span>
                {m.content}
              </div>
            );
          }
          if (m.role === "tool") {
            return (
              <div key={idx} className="p-2.5 rounded-lg bg-surface-2/60 border border-amber-500/30 text-amber-300">
                <div className="text-[10px] font-bold text-amber-400 uppercase mb-1">
                  [TOOL EXECUTION OBSERVATION]
                </div>
                <div className="text-ink/90 whitespace-pre-wrap text-[10.5px]">{m.content}</div>
              </div>
            );
          }
          return (
            <div key={idx} className="text-ink/90 pl-3 border-l-2 border-accent/40">
              <span className="text-accent text-[10px] font-bold">[FRIDAY_RESPONSE] </span>
              {m.content}
            </div>
          );
        })}

        {phase === "running" && (
          <div className="flex items-center gap-2 text-accent animate-pulse">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>&gt; Reasoning and executing graph nodes...</span>
          </div>
        )}

        {phase === "awaiting_approval" && (
          <div className="flex items-center gap-2 text-amber-400 p-2 rounded bg-amber-500/10 border border-amber-500/30">
            <ShieldIcon className="w-4 h-4 animate-bounce shrink-0" />
            <span>[HUMAN GATE] Execution halted. Awaiting human clearance payload.</span>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Terminal Footer */}
      <div className="px-4 py-2 bg-surface border-t border-line text-[10px] text-muted flex items-center justify-between font-mono">
        <span>EVENTS: {toolEvents.length} tools executed</span>
        <span>LANGGRAPH // MEMORY_SAVER</span>
      </div>
    </div>
  );
}
