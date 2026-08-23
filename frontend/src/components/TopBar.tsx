import React, { useState, useEffect, useRef } from "react";
import { WhiteBearMascotIcon, SettingsIcon, SparklesIcon, MessageSquareIcon } from "./Icons";
import type { Phase } from "../hooks/useAgent";

export type ViewMode = "hud" | "terminal";
export type ThemeMode = "cyan" | "gold" | "light";

const QUICK_MODELS = [
  { id: "ollama/llama3.2:latest", label: "🖥️ Llama 3.2 (Local)", badge: "Offline" },
  { id: "ollama/qwen3:8b", label: "🧠 Qwen 3 8B (Local)", badge: "Offline" },
  { id: "gemini/gemini-2.0-flash", label: "⚡ Gemini 2.0 Flash", badge: "Free Tier" },
  { id: "deepseek/deepseek-chat", label: "🚀 DeepSeek V3", badge: "$0.14/1M" },
  { id: "groq/deepseek-r1-distill-llama-70b", label: "⚡ Groq R1 Distill", badge: "Ultra-Fast" },
];

interface TopBarProps {
  online: boolean;
  phase?: Phase;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
  theme: ThemeMode;
  onToggleTheme: (theme: ThemeMode) => void;
  onOpenConfig?: () => void;
  onOpenHistory?: () => void;
  onResetSession?: () => void;
}

export function TopBar({
  online,
  phase = "idle",
  viewMode,
  onToggleViewMode,
  theme,
  onToggleTheme,
  onOpenConfig,
  onOpenHistory,
  onResetSession,
}: TopBarProps) {
  const isRunning = phase === "running";
  const isAwaiting = phase === "awaiting_approval";

  const nextTheme = theme === "cyan" ? "gold" : theme === "gold" ? "light" : "cyan";
  const themeLabel = theme === "cyan" ? "⚡ Cyan Glow" : theme === "gold" ? "🏆 Stark Gold" : "☀️ Clean White";

  const [currentModel, setCurrentModel] = useState(() => {
    return localStorage.getItem("FRIDAY_MODEL") || "ollama/llama3.2:latest";
  });
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectModel = (modelId: string) => {
    setCurrentModel(modelId);
    localStorage.setItem("FRIDAY_MODEL", modelId);
    setModelDropdownOpen(false);
  };

  const activeModelDisplay = QUICK_MODELS.find((m) => m.id === currentModel)?.label || currentModel.split("/").pop() || "Select Model";

  return (
    <header className="border-b border-line bg-surface/90 backdrop-blur-xl sticky top-0 z-30 px-3 md:px-4 py-2.5 transition-colors duration-200">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 font-sans">
        {/* Brand: Agent Friday + New Chat */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-transparent p-0.5 shadow-sm shrink-0 overflow-hidden border border-line">
            <img src="/ice-bear-head.svg" alt="Ice Bear Logo" className="w-full h-full rounded-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs md:text-sm font-instagram text-ink tracking-wider uppercase font-black">
                AGENT FRIDAY
              </h1>
              <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent font-sans">
                AI Assistant
              </span>
            </div>
            <p className="text-[11px] text-muted hidden sm:block font-sans">
              Your autonomous personal desktop assistant
            </p>
          </div>
          {/* Action Buttons: New Chat & History */}
          <div className="flex items-center gap-2 ml-4 border-l border-line/60 pl-4">
            {onResetSession && (
              <button
                onClick={onResetSession}
                title="Start a fresh conversation"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-black font-semibold text-xs hover:bg-accent-hover transition-all cursor-pointer shadow-sm active:scale-95 font-sans"
              >
                <span className="text-sm font-bold leading-none">+</span>
                <span>New Chat</span>
              </button>
            )}

            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                title="Chat History"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-surface-2 hover:bg-surface hover:border-accent/40 text-muted hover:text-accent font-medium text-xs transition-all cursor-pointer shadow-sm active:scale-95 font-sans"
              >
                <MessageSquareIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">History</span>
              </button>
            )}
          </div>
        </div>

        {/* Friendly Live Status Bar */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-line text-xs">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-accent font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
              Friday is working on your request...
            </span>
          ) : isAwaiting ? (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Action waiting for your approval below
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Ready to help
            </span>
          )}
        </div>

        {/* Model Switcher & Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Model Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              title="Switch between Local Offline and Cloud AI models"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 border border-line hover:border-accent/50 text-xs text-ink font-medium transition-all cursor-pointer shadow-xs"
            >
              <span className="truncate max-w-[130px] md:max-w-[160px]">{activeModelDisplay}</span>
              <span className="text-accent text-[9px]">▼</span>
            </button>

            {modelDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-2xl z-50 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-150 font-sans">
                <div className="text-[11px] font-bold text-muted px-2 py-1 border-b border-line/60">
                  Select AI Model
                </div>
                {QUICK_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                      currentModel === m.id
                        ? "bg-accent/15 border border-accent/40 text-accent font-semibold"
                        : "hover:bg-surface-2 text-ink/90 border border-transparent"
                    }`}
                  >
                    <span className="truncate">{m.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted border border-line/40 font-mono">
                      {m.badge}
                    </span>
                  </button>
                ))}
                {onOpenConfig && (
                  <button
                    onClick={() => {
                      setModelDropdownOpen(false);
                      onOpenConfig();
                    }}
                    className="w-full text-center text-xs text-accent hover:underline py-1.5 border-t border-line/60 mt-1 cursor-pointer font-medium"
                  >
                    + More Models & API Keys...
                  </button>
                )}
              </div>
            )}
          </div>


          {/* View Mode (Simple Chat vs Terminal) */}
          <div className="flex items-center p-0.5 rounded-xl bg-surface-2 border border-line text-xs">
            <button
              onClick={() => onToggleViewMode("hud")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === "hud"
                  ? "bg-accent text-black font-semibold shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => onToggleViewMode("terminal")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === "terminal"
                  ? "bg-accent text-black font-semibold shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Logs
            </button>
          </div>

          {/* Theme Switcher Button */}
          <button
            onClick={() => onToggleTheme(nextTheme)}
            title={`Switch Theme (Current: ${themeLabel})`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-2 border border-line hover:border-accent/40 text-xs text-ink font-medium transition-all cursor-pointer shadow-xs"
          >
            <SparklesIcon className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">{themeLabel}</span>
          </button>

          {/* Settings Button */}
          {onOpenConfig && (
            <button
              onClick={onOpenConfig}
              title="Settings & Permissions"
              className="p-2 rounded-xl border border-line bg-surface-2 hover:bg-surface hover:border-accent/40 text-muted hover:text-accent transition-all cursor-pointer"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
