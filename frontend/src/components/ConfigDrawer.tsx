import React, { useState, useEffect } from "react";
import { SettingsIcon, XIcon, CheckIcon, ShieldIcon, RefreshIcon, TerminalIcon, SparklesIcon, BotIcon } from "./Icons";
import type { ThemeMode } from "./TopBar";

interface ConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
}

const DEFAULT_MODELS = [
  { 
    id: "gemini/gemini-2.0-flash", 
    label: "Gemini 2.0 Flash (Recommended)", 
    provider: "Google",
    cost: "FREE / 15 RPM",
    costColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  { 
    id: "groq/deepseek-r1-distill-llama-70b", 
    label: "DeepSeek R1 Distill (Groq)", 
    provider: "Groq",
    cost: "FREE TIER",
    costColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  { 
    id: "groq/llama-3.3-70b-versatile", 
    label: "Llama 3.3 70B (Groq Ultra-Fast)", 
    provider: "Groq",
    cost: "FREE TIER",
    costColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  { 
    id: "deepseek/deepseek-chat", 
    label: "DeepSeek V3 / Flash", 
    provider: "DeepSeek",
    cost: "$0.14 / 1M Tokens",
    costColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
  { 
    id: "openai/gpt-4o-mini", 
    label: "GPT-4o Mini", 
    provider: "OpenAI",
    cost: "$0.15 / 1M Tokens",
    costColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  { 
    id: "anthropic/claude-3-5-haiku-20241022", 
    label: "Claude 3.5 Haiku", 
    provider: "Anthropic",
    cost: "Low Cost",
    costColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
];

const THEMES: { id: ThemeMode; name: string; desc: string; previewClass: string }[] = [
  {
    id: "cyan",
    name: "⚡ Arc Reactor Cyan",
    desc: "Carbon obsidian + neon cyan holographic glow (Dark)",
    previewClass: "bg-[#07090e] border-[#00e5ff] text-[#00e5ff]",
  },
  {
    id: "gold",
    name: "🏆 Stark Mark III Gold",
    desc: "Titanium dark + luxury Stark gold & amber accents",
    previewClass: "bg-[#0c0b08] border-[#ffb800] text-[#ffb800]",
  },
  {
    id: "light",
    name: "☀️ Stark Lab Clean White",
    desc: "Minimalist crisp lab white & slate (Light Mode)",
    previewClass: "bg-[#f8fafc] border-[#0ea5e9] text-[#0f172a]",
  },
];

export function ConfigDrawer({ isOpen, onClose, theme, onSelectTheme }: ConfigDrawerProps) {
  const [model, setModel] = useState("gemini/gemini-2.0-flash");
  const [customModel, setCustomModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [persona, setPersona] = useState("You are Agent Friday, a high-intelligence autonomous Human-in-the-Loop executive assistant. Be concise, precise, and proactive.");
  const [saved, setSaved] = useState(false);
  
  // Security Clearance & PC Access Toggles
  const [allowMemory, setAllowMemory] = useState(true);
  const [allowFiles, setAllowFiles] = useState(true);
  const [allowTerminal, setAllowTerminal] = useState(false);
  const [allowDb, setAllowDb] = useState(true);

  // Local Ollama scanner
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [scanningLocal, setScanningLocal] = useState(false);

  useEffect(() => {
    const savedModel = localStorage.getItem("FRIDAY_MODEL");
    const savedKey = localStorage.getItem("FRIDAY_API_KEY");
    const savedPersona = localStorage.getItem("FRIDAY_PERSONA");
    const savedPerms = localStorage.getItem("FRIDAY_PERMISSIONS");

    if (savedModel) {
      setModel(savedModel);
      if (!DEFAULT_MODELS.some((m) => m.id === savedModel)) {
        setCustomModel(savedModel);
      }
    }
    if (savedKey) setApiKey(savedKey);
    if (savedPersona) setPersona(savedPersona);
    if (savedPerms) {
      try {
        const p = JSON.parse(savedPerms);
        setAllowMemory(p.allowMemory ?? true);
        setAllowFiles(p.allowFiles ?? true);
        setAllowTerminal(p.allowTerminal ?? false);
        setAllowDb(p.allowDb ?? true);
      } catch {}
    }
    scanLocalOllama();
  }, []);

  const scanLocalOllama = async () => {
    setScanningLocal(true);
    try {
      const res = await fetch("http://localhost:11434/api/tags", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        const names = (data.models || []).map((m: { name: string }) => `ollama/${m.name}`);
        setLocalModels(names);
      } else {
        setLocalModels([]);
      }
    } catch {
      setLocalModels([]);
    } finally {
      setScanningLocal(false);
    }
  };

  const handleSave = () => {
    const activeModel = customModel.trim() ? customModel.trim() : model;
    localStorage.setItem("FRIDAY_MODEL", activeModel);
    if (apiKey) localStorage.setItem("FRIDAY_API_KEY", apiKey);
    localStorage.setItem("FRIDAY_PERSONA", persona);
    
    const perms = { allowMemory, allowFiles, allowTerminal, allowDb };
    localStorage.setItem("FRIDAY_PERMISSIONS", JSON.stringify(perms));

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-md bg-surface border-l border-line h-full flex flex-col p-5 md:p-6 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-line">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold text-ink font-mono uppercase tracking-wider">
              Control Center & Clearances
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 py-4 space-y-5 text-xs">
          {/* Theme Switcher Gallery */}
          <div className="p-3.5 rounded-xl border border-line bg-surface-2/70 space-y-2.5">
            <span className="font-bold text-ink flex items-center gap-1.5 font-mono uppercase text-[11px]">
              <SparklesIcon className="w-3.5 h-3.5 text-accent" />
              Visual Theme Palette
            </span>
            <div className="space-y-1.5 pt-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTheme(t.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    theme === t.id
                      ? "border-accent bg-accent/15 text-ink shadow-sm"
                      : "border-line bg-surface/60 text-muted hover:bg-surface"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-ink text-xs">{t.name}</div>
                    <div className="text-[10.5px] text-muted">{t.desc}</div>
                  </div>
                  {theme === t.id && (
                    <span className="text-[10px] font-mono font-bold text-accent px-2 py-0.5 rounded bg-surface border border-accent/30">
                      ACTIVE
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 🧠 Agent Persona & Custom Instructions */}
          <div className="p-3.5 rounded-xl border border-line bg-surface-2/70 space-y-2">
            <div className="flex items-center justify-between border-b border-line/60 pb-2">
              <span className="font-bold text-ink flex items-center gap-1.5 font-mono uppercase text-[11px]">
                <BotIcon className="w-3.5 h-3.5 text-accent" />
                Friday Persona & Directives
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-accent/10 text-accent border border-accent/20">
                Memory Synced
              </span>
            </div>
            <p className="text-[10.5px] text-muted leading-relaxed">
              Define Friday's character, custom tone, and project instructions. Saved locally on your PC.
            </p>
            <textarea
              rows={3}
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="e.g., You are Agent Friday. Address the user with high respect, explain all tool operations concisely, and enforce strict safety."
              className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-ink text-xs focus:outline-none focus:border-accent font-sans leading-relaxed resize-none"
            />
          </div>

          {/* 🛡️ PC Access & Security Clearance Toggles */}
          <div className="p-3.5 rounded-xl border border-line bg-surface-2/70 space-y-3">
            <div className="flex items-center justify-between border-b border-line/60 pb-2">
              <span className="font-bold text-ink flex items-center gap-1.5 font-mono uppercase text-[11px]">
                <ShieldIcon className="w-3.5 h-3.5 text-accent" />
                PC Access & Safety Controls
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-accent/10 text-accent border border-accent/20">
                User Managed
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium text-ink">🧠 Local PC Memory</div>
                  <div className="text-[10px] text-muted font-mono">Persist facts in .friday/memory.json</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowMemory}
                  onChange={(e) => setAllowMemory(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium text-ink">📁 Workspace File System</div>
                  <div className="text-[10px] text-muted font-mono">Read/write files in active folder</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowFiles}
                  onChange={(e) => setAllowFiles(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium text-ink">🗄️ Database Operations</div>
                  <div className="text-[10px] text-muted font-mono">Query & update mock/local DB</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowDb}
                  onChange={(e) => setAllowDb(e.target.checked)}
                  className="w-4 h-4 accent-accent rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium text-ink">💻 Terminal Shell Execution</div>
                  <div className="text-[10px] text-muted font-mono">Execute raw PowerShell commands</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowTerminal}
                  onChange={(e) => setAllowTerminal(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Model Presets & Cost Badges */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted font-mono">
                Select Model (Free & Low-Cost Flash)
              </label>
              <span className="text-[9px] font-mono text-emerald-400">Zero-Token Waste</span>
            </div>
            
            <div className="space-y-1.5">
              {DEFAULT_MODELS.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    model === m.id && !customModel
                      ? "border-accent bg-accent/10 text-ink shadow-xs"
                      : "border-line bg-surface-2/40 text-muted hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="model"
                      value={m.id}
                      checked={model === m.id && !customModel}
                      onChange={(e) => {
                        setModel(e.target.value);
                        setCustomModel("");
                      }}
                      className="text-accent focus:ring-accent"
                    />
                    <div>
                      <span className="text-xs font-medium block text-ink">{m.label}</span>
                      <span className="text-[10px] text-muted">{m.provider}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${m.costColor}`}>
                    {m.cost}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom Model String Override */}
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-muted mb-1 font-mono">
                Or Type Custom Model Identifier:
              </label>
              <input
                type="text"
                placeholder="e.g. gemini/gemini-2.0-flash or deepseek/deepseek-chat"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-ink text-xs focus:outline-none focus:border-accent font-mono placeholder:text-muted/50"
              />
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1 font-mono">
              Provider API Key
            </label>
            <input
              type="password"
              placeholder="Paste your API key here..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-ink text-xs focus:outline-none focus:border-accent font-mono"
            />
            <p className="text-[10px] text-muted mt-1 flex items-center gap-1">
              <ShieldIcon className="w-3 h-3 text-emerald-400 shrink-0" />
              Saved in browser localStorage only. Zero server-side persistence.
            </p>
          </div>

          {/* Local Ollama Detection Box */}
          <div className="p-3.5 rounded-xl border border-line bg-surface-2/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5 font-mono">
                <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                Local Offline Models (Ollama)
              </span>
              <button
                onClick={scanLocalOllama}
                disabled={scanningLocal}
                className="text-[10px] text-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshIcon className={`w-3 h-3 ${scanningLocal ? "animate-spin" : ""}`} />
                Scan
              </button>
            </div>

            {localModels.length > 0 ? (
              <div className="space-y-1.5 mt-2">
                {localModels.map((m) => (
                  <label
                    key={m}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs font-mono ${
                      model === m ? "border-emerald-400 bg-emerald-500/10 text-emerald-300" : "border-line bg-surface text-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="model"
                      value={m}
                      checked={model === m}
                      onChange={(e) => setModel(e.target.value)}
                      className="text-emerald-400 focus:ring-emerald-400 mr-2"
                    />
                    <span className="truncate flex-1">{m}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      100% Free
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted leading-relaxed">
                No Ollama running at <code className="text-accent font-mono">localhost:11434</code>. Run <code className="text-ink font-mono bg-black/40 px-1 py-0.5 rounded">ollama serve</code> for 100% offline execution.
              </p>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-line flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent hover:bg-accent-hover text-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-md font-mono"
          >
            {saved ? (
              <>
                <CheckIcon className="w-4 h-4 text-black" />
                Saved!
              </>
            ) : (
              "Apply Settings"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
