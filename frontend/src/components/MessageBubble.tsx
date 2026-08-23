import React, { useState } from "react";
import type { MessageView } from "../types";
import { BotIcon, TerminalIcon } from "./Icons";
import { MarkdownContent } from "./MarkdownContent";

export function MessageBubble({ message }: { message: MessageView }) {
  const [expanded, setExpanded] = useState(false);
  const time = message.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (message.role === "user") {
    // Check if message contains an attached file/document header
    let displayContent = message.content;
    let attachedDocName: string | null = null;
    let extractedDocText: string | null = null;

    const attachMatch = message.content.match(/^\[Attached (?:Document|File):\s*(.+?)\]\n([\s\S]*?)(?:\n\n(?:User Query|User Question):\s*([\s\S]*)|$)/);
    if (attachMatch) {
      attachedDocName = (attachMatch[1] || "").trim();
      extractedDocText = (attachMatch[2] || "").trim();
      displayContent = attachMatch[3] ? attachMatch[3].trim() : "Please analyze this attached document.";
    }

    return (
      <div className="flex justify-end items-start gap-2.5 font-sans">
        <div className="max-w-[85%] rounded-2xl bg-accent/20 border border-accent/40 px-4 py-3 text-sm text-ink shadow-sm space-y-2">
          {/* Clean Attached Document Badge */}
          {attachedDocName && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface/80 border border-accent/30 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">📎</span>
                <div className="min-w-0">
                  <div className="font-bold text-ink truncate max-w-[240px] text-xs">
                    {attachedDocName}
                  </div>
                  <div className="text-[10px] text-accent">Document Attached</div>
                </div>
              </div>
              {extractedDocText && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="text-[10.5px] text-muted hover:text-accent font-medium cursor-pointer px-2 py-0.5 rounded bg-surface-2 shrink-0 transition-colors"
                >
                  {expanded ? "Hide Text" : "View Text"}
                </button>
              )}
            </div>
          )}

          {/* Optional Collapsed Extracted Text Drawer */}
          {expanded && extractedDocText && (
            <div className="p-2.5 rounded-xl bg-black/60 border border-line text-[11px] text-ink/80 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed animate-in fade-in duration-150">
              {extractedDocText}
            </div>
          )}

          {/* Clean User Query */}
          <p className="whitespace-pre-wrap leading-relaxed font-sans">{displayContent}</p>
          
          <div className="text-[9.5px] font-mono text-accent/80 text-right mt-1 opacity-85">
            {time}
          </div>
        </div>
      </div>
    );
  }

  if (message.role === "assistant") {
    return (
      <div className="flex justify-start items-start gap-2.5 font-sans">
        <div className="w-7 h-7 rounded-full bg-transparent p-0.5 shadow-sm shrink-0 mt-0.5 border border-line overflow-hidden">
          <img
            src="/ice-bear-head.svg"
            alt="Ice Bear Avatar"
            className="w-full h-full rounded-full object-contain"
          />
        </div>
        <div className="max-w-[88%] rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm text-ink shadow-sm">
          <MarkdownContent content={message.content} />
          <div className="text-[9.5px] font-mono text-muted text-right mt-2 pt-1 border-t border-line/40 opacity-80">
            {time}
          </div>
        </div>
      </div>
    );
  }

  // Tool message: Sleek Collapsible Badge
  const previewText = message.content.slice(0, 85).replace(/\n/g, " ");

  return (
    <div className="flex justify-start items-start gap-2.5 pl-9 font-sans">
      <div className="max-w-[90%] w-full rounded-xl border border-line/60 bg-surface-2/40 px-3 py-2 font-mono text-xs text-muted shadow-xs transition-all">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-amber-400/90 hover:text-amber-300 font-semibold uppercase tracking-wider text-[10.5px] cursor-pointer transition-colors text-left truncate flex-1"
          >
            <TerminalIcon className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="shrink-0 font-bold">Tool Output:</span>
            <span className="text-muted font-normal truncate max-w-[240px]">
              {previewText}...
            </span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-mono text-muted/70">{time}</span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-surface border border-line text-muted hover:text-accent hover:border-accent/30 transition-colors cursor-pointer"
            >
              {expanded ? "Collapse ▲" : "View Full ▼"}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-2 text-ink/90 whitespace-pre-wrap break-words bg-black/40 p-3 rounded-xl border border-line/60 text-[11px] max-h-56 overflow-y-auto leading-relaxed animate-in fade-in duration-150">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}
