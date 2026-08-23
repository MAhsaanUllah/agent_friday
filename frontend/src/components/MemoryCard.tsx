import React, { useEffect, useState } from "react";
import { BotIcon, RefreshIcon, CheckIcon } from "./Icons";

interface MemoryData {
  user_preferences: string[];
  project_context: {
    project_name?: string;
    type?: string;
    workspace?: string;
  };
  learned_facts: string[];
  recent_tasks: string[];
}

export function MemoryCard() {
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [newFact, setNewFact] = useState("");
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const fetchMemory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/agent/memory");
      if (res.ok) {
        const data = await res.json();
        setMemory(data);
      }
    } catch {
      setMemory({
        user_preferences: [
          "Prefers clean, friendly, easy-to-understand explanations",
          "Always asks for confirmation before installing software or running terminal scripts",
          "Remembers active project context and personal instructions",
        ],
        project_context: {
          project_name: "Agent Friday",
          type: "Personal Assistant",
        },
        learned_facts: [],
        recent_tasks: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemory();
  }, []);

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;

    try {
      const res = await fetch("/agent/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fact: newFact.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMemory(data);
      }
      setNewFact("");
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch {
      if (memory) {
        setMemory({
          ...memory,
          learned_facts: [...memory.learned_facts, newFact.trim()],
        });
      }
      setNewFact("");
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm space-y-3 font-sans transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center">
            <img src="/ice-bear-head.svg" alt="Bear" className="w-5 h-5 rounded-full object-contain" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-ink">
              Memory & Persona
            </h3>
            <span className="text-[10px] text-muted">
              Saved locally on your PC
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchMemory}
            title="Refresh Memory"
            className="text-muted hover:text-accent cursor-pointer transition-colors p-1"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-muted hover:text-ink cursor-pointer px-2 py-0.5 rounded-lg bg-surface-2"
          >
            {expanded ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* User Preferences List */}
          <div>
            <div className="text-[11px] font-semibold text-muted mb-1.5 flex items-center justify-between">
              <span>Preferences & Rules</span>
              <span className="text-accent text-[10px] font-medium">Active</span>
            </div>
            <div className="space-y-1.5">
              {memory?.user_preferences.map((pref, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-xl bg-surface-2 border border-line/60 text-xs text-ink/90 leading-relaxed"
                >
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <span>{pref}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Learned Facts */}
          {memory && memory.learned_facts.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-muted mb-1.5">
                Learned Notes ({memory.learned_facts.length})
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {memory.learned_facts.map((fact, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="truncate">{fact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Fact Form */}
          <form onSubmit={handleAddFact} className="pt-1">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="+ Teach Friday a rule or fact..."
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl border border-line bg-surface-2 text-ink text-xs focus:outline-none focus:border-accent font-sans placeholder:text-muted/60"
              />
              <button
                type="submit"
                disabled={!newFact.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-black font-semibold text-xs transition-all disabled:opacity-40 cursor-pointer shrink-0 shadow-xs"
              >
                {added ? <CheckIcon className="w-3.5 h-3.5" /> : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
