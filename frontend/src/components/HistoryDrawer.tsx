import React, { useEffect, useState } from "react";
import { XIcon, MessageSquareIcon } from "./Icons";
import { getThreads } from "../api/client";

interface Thread {
  id: string;
  title: string;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectThread: (threadId: string) => void;
  currentThreadId: string | null;
}

export function HistoryDrawer({ isOpen, onClose, onSelectThread, currentThreadId }: HistoryDrawerProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadThreads();
    }
  }, [isOpen]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const data = await getThreads();
      setThreads(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm transition-opacity">
      {/* Sidebar Drawer from Left */}
      <div className="w-full max-w-sm bg-surface border-r border-line h-full flex flex-col p-4 shadow-2xl animate-in slide-in-from-left duration-200 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent">
              <MessageSquareIcon className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider font-mono">
              Chat History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body / Thread List */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-2">
          {loading ? (
            <div className="text-center text-muted text-xs py-10">Loading history...</div>
          ) : threads.length === 0 ? (
            <div className="text-center text-muted text-xs py-10">No previous sessions found.</div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onSelectThread(t.id);
                  onClose();
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors flex items-center gap-2.5 cursor-pointer ${
                  currentThreadId === t.id
                    ? "border-accent bg-accent/10 text-ink shadow-sm"
                    : "border-line bg-surface-2/40 text-muted hover:bg-surface hover:text-ink"
                }`}
              >
                <MessageSquareIcon className={`w-4 h-4 shrink-0 ${currentThreadId === t.id ? 'text-accent' : 'text-muted'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{t.title}</div>
                  <div className="text-[10px] opacity-70 font-mono truncate">{t.id}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
