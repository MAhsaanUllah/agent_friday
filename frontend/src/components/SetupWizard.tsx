import React, { useState, useEffect } from "react";
import { CheckIcon, ShieldIcon, TerminalIcon, BotIcon } from "./Icons";
import { DEFAULT_MODELS } from "./ConfigModal";

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [model, setModel] = useState<string>("gemini/gemini-2.0-flash");
  const [apiKey, setApiKey] = useState("");
  const [securityLevel, setSecurityLevel] = useState<"strict" | "medium" | "full">("strict");
  const [localModels, setLocalModels] = useState<any[]>([]);

  useEffect(() => {
    // Attempt to detect local Ollama models
    fetch("http://127.0.0.1:11434/api/tags")
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          const formatted = data.models.map((m: any) => ({
            id: `ollama/${m.name}`,
            label: m.name,
            provider: "Local (Ollama)",
          }));
          setLocalModels(formatted);
        }
      })
      .catch(() => {
        // Ollama not running, ignore
      });
  }, []);

  const handleFinish = () => {
    localStorage.setItem("FRIDAY_MODEL", model);
    if (apiKey.trim()) {
      localStorage.setItem("FRIDAY_API_KEY", apiKey.trim());
    }
    
    const allowlist: string[] = [];
    if (securityLevel === "medium" || securityLevel === "full") {
      allowlist.push("run_terminal_command");
    }
    if (securityLevel === "full") {
      allowlist.push("install_windows_package");
    }
    
    localStorage.setItem("FRIDAY_TOOL_ALLOWLIST", JSON.stringify(allowlist));
    localStorage.setItem("FRIDAY_SETUP_COMPLETE", "true");
    
    onComplete();
  };

  const [modelTab, setModelTab] = useState<"cloud" | "local">("cloud");

  const cloudModels = DEFAULT_MODELS;
  const activeModels = modelTab === "cloud" ? cloudModels : localModels;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 font-sans">
      <div className="w-full max-w-3xl bg-surface border border-line rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-surface-2 p-4 sm:p-5 border-b border-line flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center border border-accent/20 overflow-hidden shadow-[0_0_10px_rgba(var(--color-accent),0.1)] shrink-0">
            <img src="/ice-bear-head.svg" alt="Mascot" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <h2 className="text-lg font-black text-ink tracking-tight leading-tight">Welcome to Agent Friday</h2>
            <p className="text-[11px] text-muted mt-0.5 font-medium">Let's configure your local desktop assistant to get started.</p>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right duration-300">
              
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-line">
                  <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px]">1</span>
                    AI Model & Connection
                  </h3>
                  
                  {/* Tabs */}
                  <div className="flex bg-bg rounded-lg p-1 border border-line">
                    <button
                      onClick={() => setModelTab("cloud")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        modelTab === "cloud" ? "bg-surface-2 text-ink shadow-sm border border-line" : "text-muted hover:text-ink"
                      }`}
                    >
                      Cloud Models
                    </button>
                    <button
                      onClick={() => setModelTab("local")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        modelTab === "local" ? "bg-surface-2 text-ink shadow-sm border border-line" : "text-muted hover:text-ink"
                      }`}
                    >
                      Local Offline
                      {localModels.length > 0 && (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-full">
                          {localModels.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar p-1">
                  {activeModels.length === 0 ? (
                    <div className="col-span-full py-6 text-center text-sm text-muted">
                      No local models detected. Make sure Ollama is running.
                    </div>
                  ) : (
                    activeModels.map((m) => {
                      const isSelected = model === m.id;
                      const isLocal = m.provider.includes("Local");
                      return (
                        <button
                          key={m.id}
                          onClick={() => setModel(m.id)}
                          className={`relative p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-center ${
                            isSelected
                              ? "bg-accent/10 border-accent shadow-[0_2px_10px_rgba(var(--color-accent),0.15)] ring-1 ring-accent"
                              : "bg-surface-2 border-line text-muted hover:border-accent/50 hover:bg-surface-2/80 hover:-translate-y-0.5 hover:shadow-sm"
                          }`}
                        >
                          <div className="font-bold text-xs leading-tight truncate w-full pr-4 pb-1 text-ink">
                            {m.label}
                          </div>
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              isLocal ? "bg-emerald-500/10 text-emerald-400" : "bg-black/20 text-muted"
                            }`}>
                              {m.provider}
                            </span>
                            {isSelected && <CheckIcon className="w-3.5 h-3.5 text-accent absolute top-2.5 right-2.5" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {!model.startsWith("ollama/") && (
                <div className="bg-surface-2 p-4 rounded-xl border border-line">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-ink">API Key</label>
                    <span className="text-[10px] text-muted">Stored securely in browser</span>
                  </div>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter API Key for ${model.split("/")[0]}...`}
                    className="w-full bg-bg border border-line rounded-lg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-inner"
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-8 py-3.5 bg-accent text-black font-bold text-sm rounded-xl hover:bg-accent-hover transition-all active:scale-95 shadow-[0_4px_15px_rgba(var(--color-accent),0.3)] flex items-center gap-2"
                >
                  Next Step ➔
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px]">2</span>
                  Autonomy & Permissions
                </h3>
              </div>
              
              <p className="text-xs text-muted leading-relaxed">
                Choose how much autonomy Agent Friday should have. You can adjust this later in settings.
              </p>

              <div className="space-y-3">
                <label className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  securityLevel === "strict" ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20" : "bg-surface-2 border-line hover:border-accent/40"
                }`}>
                  <input
                    type="radio"
                    name="securityLevel"
                    checked={securityLevel === "strict"}
                    onChange={() => setSecurityLevel("strict")}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-ink flex items-center gap-2">
                      <ShieldIcon className="w-4 h-4 text-emerald-400" />
                      Strict (Human-in-the-loop)
                    </div>
                    <div className="text-[11px] text-muted mt-1 leading-relaxed">
                      Safe & read-only. Terminal and System Installations are completely blocked.
                    </div>
                  </div>
                </label>

                <label className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  securityLevel === "medium" ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20" : "bg-surface-2 border-line hover:border-accent/40"
                }`}>
                  <input
                    type="radio"
                    name="securityLevel"
                    checked={securityLevel === "medium"}
                    onChange={() => setSecurityLevel("medium")}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-ink flex items-center gap-2">
                      <TerminalIcon className="w-4 h-4 text-amber-400" />
                      Medium (Developer)
                    </div>
                    <div className="text-[11px] text-muted mt-1 leading-relaxed">
                      Terminal access enabled for running commands, but software installation is blocked.
                    </div>
                  </div>
                </label>

                <label className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  securityLevel === "full" ? "bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/20" : "bg-surface-2 border-line hover:border-accent/40"
                }`}>
                  <input
                    type="radio"
                    name="securityLevel"
                    checked={securityLevel === "full"}
                    onChange={() => setSecurityLevel("full")}
                    className="w-4 h-4 accent-rose-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-ink flex items-center gap-2">
                      <BotIcon className="w-4 h-4 text-rose-400" />
                      Full Autonomy
                    </div>
                    <div className="text-[11px] text-muted mt-1 leading-relaxed">
                      God mode. Terminal access AND software installation enabled. Agent can freely modify your system.
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex justify-between pt-4 mt-2 border-t border-line">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 text-muted hover:text-ink hover:bg-surface-2 rounded-xl transition-all font-medium text-xs"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  className="px-8 py-3 bg-emerald-500 text-black font-bold text-sm rounded-xl hover:bg-emerald-400 transition-all active:scale-95 flex items-center gap-2 shadow-[0_4px_15px_rgba(16,185,129,0.3)]"
                >
                  <CheckIcon className="w-4 h-4" />
                  Complete Setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
