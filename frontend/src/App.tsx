import React, { useEffect, useState } from "react";
import { useAgent } from "./hooks/useAgent";
import { ApprovalCard } from "./components/ApprovalCard";
import { ChatPanel } from "./components/ChatPanel";
import { PlanSteps } from "./components/PlanSteps";
import { ToolLog } from "./components/ToolLog";
import { TopBar, ViewMode, ThemeMode } from "./components/TopBar";
import { ToolRegistryCard } from "./components/ToolRegistryCard";
import { ConfigModal } from "./components/ConfigModal";
import { TerminalView } from "./components/TerminalView";
import { McpServerStatus } from "./components/McpServerStatus";
import { FloatingApprovalBar } from "./components/FloatingApprovalBar";
import { ResetModal } from "./components/ResetModal";
import { MemoryCard } from "./components/MemoryCard";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { SetupWizard } from "./components/SetupWizard";

export default function App() {
  const { session, send, resume, reset } = useAgent();
  const [online, setOnline] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(() => {
    return localStorage.getItem("FRIDAY_SETUP_COMPLETE") === "true";
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("hud");
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem("FRIDAY_THEME") as ThemeMode) || "cyan";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("FRIDAY_THEME", theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    const checkHealth = () => {
      fetch("/health")
        .then((r) => r.ok)
        .catch(() => false)
        .then((ok) => {
          if (!cancelled) setOnline(ok);
        });
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleConfirmReset = () => {
    reset();
    setIsResetModalOpen(false);
  };

  const busy = session.phase === "running";
  const awaiting = session.phase === "awaiting_approval";

  if (!isSetupComplete) {
    return <SetupWizard onComplete={() => setIsSetupComplete(true)} />;
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-bg text-ink overflow-hidden selection:bg-accent/30 selection:text-white transition-colors duration-200">
      <TopBar
        online={online}
        phase={session.phase}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        theme={theme}
        onToggleTheme={setTheme}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onResetSession={() => setIsResetModalOpen(true)}
      />

      <main className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 gap-3 p-2 md:p-3 overflow-hidden flex-col md:flex-row">
        {/* Main Left Area: HUD Mode OR Terminal Mode */}
        <div className="flex flex-col min-h-0 flex-1 w-full overflow-hidden animate-in fade-in duration-200">
          {viewMode === "hud" ? (
            <ChatPanel
              messages={session.messages}
              busy={busy}
              awaitingApproval={awaiting}
              pending={session.pending}
              progress={session.progress}
              onApprove={() => resume(true)}
              onDeny={() => resume(false)}
              onStop={stop}
              onSubmit={send}
            />
          ) : (
            <TerminalView
              messages={session.messages}
              phase={session.phase}
              plan={session.plan}
              online={online}
            />
          )}
        </div>

        {/* Right Sidebar: Telemetry, Plan, Gate & Registry */}
        <aside className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col gap-3 h-full overflow-y-auto pr-0.5 pb-16">
          {session.error && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 shadow-sm">
              <div className="font-bold mb-1 uppercase tracking-wider text-[10px] text-rose-400 font-mono">
                Execution Error
              </div>
              <p className="leading-relaxed">{session.error}</p>
            </div>
          )}

          {/* Sidebar Human Gate Card */}
          <ApprovalCard
            pending={session.pending}
            busy={busy}
            onApprove={() => resume(true)}
            onDeny={() => resume(false)}
          />

          {/* Plan Steps */}
          <PlanSteps plan={session.plan} />

          {/* Local Persistent Memory & Persona */}
          <MemoryCard />

          {/* Tool Stream */}
          <ToolLog messages={session.messages} />

          {/* Catalog of Tools */}
          <ToolRegistryCard />

          {/* Connected MCP Servers */}
          <McpServerStatus />
        </aside>
      </main>

      {/* Modern Center Cybernetic Reset Modal (Zero browser alert dialogs) */}
      <ResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
      />

      {/* Slide-over Settings / BYOK Drawer */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        theme={theme}
        onSelectTheme={setTheme}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectThread={(tid) => console.log("Load thread", tid)}
        currentThreadId={session.threadId || null}
      />
    </div>
  );
}
