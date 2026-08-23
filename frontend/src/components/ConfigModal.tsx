import React, { useState, useEffect } from "react";
import { SettingsIcon, XIcon, CheckIcon, ShieldIcon, RefreshIcon, TerminalIcon, SparklesIcon, BotIcon } from "./Icons";
import type { ThemeMode } from "./TopBar";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
}

export const DEFAULT_MODELS = [
  { 
    id: "gemini/gemini-2.0-flash", 
    label: "Gemini 2.0 Flash", 
    provider: "Google",
    cost: "FREE / 15 RPM",
    costColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  { 
    id: "gemini/gemini-2.0-pro-exp-02-05", 
    label: "Gemini 2.0 Pro", 
    provider: "Google",
    cost: "FREE / 15 RPM",
    costColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  { 
    id: "anthropic/claude-3-5-sonnet-20241022", 
    label: "Claude 3.5 Sonnet", 
    provider: "Anthropic",
    cost: "$3.00 / 1M Tokens",
    costColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  },
  { 
    id: "deepseek/deepseek-chat", 
    label: "DeepSeek V3 (Flash)", 
    provider: "DeepSeek",
    cost: "$0.14 / 1M Tokens",
    costColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
  { 
    id: "deepseek/deepseek-reasoner", 
    label: "DeepSeek R1 (Reasoner)", 
    provider: "DeepSeek",
    cost: "$0.55 / 1M Tokens",
    costColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  { 
    id: "openrouter/moonshotai/moonshot-v1-32k", 
    label: "Kimi (Moonshot v1)", 
    provider: "Moonshot",
    cost: "$1.20 / 1M Tokens",
    costColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  { 
    id: "openai/gpt-4o", 
    label: "GPT-4o", 
    provider: "OpenAI",
    cost: "$2.50 / 1M Tokens",
    costColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
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

export function ConfigModal({ isOpen, onClose, theme, onSelectTheme }: ConfigModalProps) {
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
  }, [isOpen]);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity p-4">
      {/* Centered Modal Card */}
      <div className="w-full max-w-5xl bg-surface border border-line rounded-2xl flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 font-sans max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line bg-surface-2/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/15 border border-accent/30">
              <SettingsIcon className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink font-mono uppercase tracking-wider">
                Control Center & Configuration
              </h2>
              <span className="text-[10px] text-muted block">Manage AI Models, Permissions, and Themes</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2-Column Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* COLUMN 1: Models & Authentication */}
          <div className="space-y-5">
            {/* Model Presets & Cost Badges */}
            <div className="p-3.5 rounded-xl border border-line bg-surface-2/70 space-y-3">
              <div className="flex items-center justify-between border-b border-line/60 pb-2">
                <span className="font-bold text-ink flex items-center gap-1.5 font-mono uppercase text-[11px]">
                  <SparklesIcon className="w-3.5 h-3.5 text-accent" />
                  Select Cloud LLM Provider
                </span>
                <span className="text-[9px] font-mono text-emerald-400">Zero-Token Waste</span>
              </div>
              
              <div className="space-y-1.5 pt-1">
                {DEFAULT_MODELS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      model === m.id && !customModel
                        ? "border-accent bg-accent/10 text-ink shadow-sm"
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
                        className="text-accent focus:ring-accent w-4 h-4"
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
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-muted mb-1 font-mono">
                  Or Type Custom Model Identifier:
                </label>
                <input
                  type="text"
                  placeholder="e.g. gemini/gemini-2.0-flash or deepseek/deepseek-chat"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-ink text-xs focus:outline-none focus:border-accent font-mono placeholder:text-muted/50 shadow-inner"
                />
              </div>
            </div>

            {/* API Key */}
            <div className="p-3.5 rounded-xl border border-line bg-surface-2/70 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted font-mono flex items-center justify-between">
                <span>Provider API Key</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldIcon className="w-2.5 h-2.5" /> Local Only
                </span>
              </label>
              <input
                type="password"
                placeholder="Paste your API key here..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-ink text-xs focus:outline-none focus:border-accent font-mono shadow-inner"
              />
            </div>
            
            {/* Visual Theme */}
            <div className="p-3.5 rounded-xl border border-line bg-surface-2/70 space-y-2.5">
              <span className="font-bold text-ink flex items-center gap-1.5 font-mono uppercase text-[11px]">
                Visual Theme Palette
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelectTheme(t.id)}
                    className={`flex flex-col p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      theme === t.id
                        ? "border-accent bg-accent/15 text-ink shadow-sm"
                        : "border-line bg-surface/60 text-muted hover:bg-surface"
                    }`}
                  >
                    <div className="font-semibold text-ink text-xs mb-1">{t.name}</div>
                    <div className="text-[9px] text-muted flex-1">{t.desc}</div>
                    {theme === t.id && (
                      <span className="mt-2 inline-block text-[9px] font-mono font-bold text-accent px-1.5 py-0.5 rounded bg-surface border border-accent/30 self-start">
                        ACTIVE
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* COLUMN 2: Persona & OS Access */}
          <div className="space-y-5">
            
            {/* Agent Persona */}
            <div className="p-3.5 rounded-xl border border-line bg-surface-2/70 flex flex-col h-auto">
              <div className="flex items-center justify-between border-b border-line/60 pb-2 mb-2">
                <span className="font-bold text-ink flex items-center gap-1.5 font-mono uppercase text-[11px]">
                  <BotIcon className="w-3.5 h-3.5 text-accent" />
                  Friday Persona & Directives
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-accent/10 text-accent border border-accent/20">
                  Memory Synced
                </span>
              </div>
              <p className="text-[10px] text-muted leading-relaxed mb-3">
                Define the agent's character, custom tone, and project instructions.
              </p>
              <textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="e.g., You are Agent Friday..."
                className="w-full flex-1 min-h-[140px] px-3 py-2 rounded-xl border border-line bg-surface text-ink text-xs focus:outline-none focus:border-accent font-sans leading-relaxed resize-none shadow-inner"
              />
            </div>

            {/* PC Access & Security Toggles */}
            <div className="p-3.5 rounded-xl border border-line bg-surface-2/70 space-y-3">
              <div className="flex items-center justify-between border-b border-line/60 pb-2">
                <span className="font-bold text-ink flex items-center gap-1.5 font-mono uppercase text-[11px]">
                  <ShieldIcon className="w-3.5 h-3.5 text-accent" />
                  PC Access & Safety Controls
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-line bg-surface/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMemory}
                    onChange={(e) => setAllowMemory(e.target.checked)}
                    className="w-4 h-4 accent-accent rounded cursor-pointer"
                  />
                  <div>
                    <div className="font-medium text-ink text-xs">🧠 Local PC Memory</div>
                    <div className="text-[9px] text-muted font-mono">.friday/memory.json</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-line bg-surface/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowFiles}
                    onChange={(e) => setAllowFiles(e.target.checked)}
                    className="w-4 h-4 accent-accent rounded cursor-pointer"
                  />
                  <div>
                    <div className="font-medium text-ink text-xs">📁 File System</div>
                    <div className="text-[9px] text-muted font-mono">Workspace Read/Write</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-line bg-surface/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDb}
                    onChange={(e) => setAllowDb(e.target.checked)}
                    className="w-4 h-4 accent-accent rounded cursor-pointer"
                  />
                  <div>
                    <div className="font-medium text-ink text-xs">🗄️ Databases</div>
                    <div className="text-[9px] text-muted font-mono">Query mock/local DB</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded-lg border border-line bg-surface/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowTerminal}
                    onChange={(e) => setAllowTerminal(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                  <div>
                    <div className="font-medium text-ink text-xs">💻 Terminal Execution</div>
                    <div className="text-[9px] text-muted font-mono">Raw PowerShell</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Local Ollama Detection Box */}
            <div className="p-3.5 rounded-xl border border-line bg-surface-2/60 flex flex-col">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-line/60">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5 font-mono">
                  <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Local Offline Models (Ollama)
                </span>
                <button
                  onClick={scanLocalOllama}
                  disabled={scanningLocal}
                  className="text-[10px] text-accent hover:underline flex items-center gap-1 cursor-pointer bg-accent/10 px-2 py-1 rounded"
                >
                  <RefreshIcon className={`w-3 h-3 ${scanningLocal ? "animate-spin" : ""}`} />
                  Scan
                </button>
              </div>

              {localModels.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                  {localModels.map((m) => (
                    <label
                      key={m}
                      className={`flex items-center p-2 rounded-lg border cursor-pointer text-[10px] font-mono transition-colors ${
                        model === m ? "border-emerald-400 bg-emerald-500/10 text-emerald-300" : "border-line bg-surface text-muted hover:bg-surface-2"
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
                      <span className="truncate">{m}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted leading-relaxed mt-1">
                  No Ollama detected at <code className="text-accent font-mono">localhost:11434</code>. Run <code className="text-ink font-mono bg-black/40 px-1 py-0.5 rounded">ollama serve</code> for offline capabilities.
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line flex items-center justify-end gap-3 bg-surface-2/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl text-xs font-semibold bg-accent hover:bg-accent-hover text-black transition-colors flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)] font-mono"
          >
            {saved ? (
              <>
                <CheckIcon className="w-4 h-4 text-black" />
                Configuration Saved!
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
