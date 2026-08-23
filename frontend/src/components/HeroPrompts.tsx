import React from "react";
import { CalculatorIcon, DatabaseIcon, SearchIcon, SparklesIcon } from "./Icons";

interface HeroPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  {
    title: "Web Search & Research",
    description: "Search live internet info and summarize key takeaways.",
    prompt: "Search who won the latest cricket World Cup and give me a 3-bullet summary.",
    icon: <SearchIcon className="w-4 h-4 text-accent" />,
    tag: "Quick Search",
  },
  {
    title: "Open Apps & Websites",
    description: "Launch apps like YouTube, Calculator, or Notepad on your PC.",
    prompt: "Open YouTube in my browser and launch Calculator on my PC.",
    icon: <SparklesIcon className="w-4 h-4 text-emerald-400" />,
    tag: "PC Control",
  },
  {
    title: "Math & Calculations",
    description: "Crunch complex formulas, numbers, and budget estimates.",
    prompt: "Calculate (450 * 12) + 1500 and give me the final total.",
    icon: <CalculatorIcon className="w-4 h-4 text-amber-400" />,
    tag: "Calculator",
  },
  {
    title: "Install Software (Winget)",
    description: "Safely download & install apps with your confirmation.",
    prompt: "Search for VLC Media Player and help me install it on my PC.",
    icon: <DatabaseIcon className="w-4 h-4 text-cyan-400" />,
    tag: "Installer",
  },
];

export function HeroPrompts({ onSelectPrompt }: HeroPromptsProps) {
  return (
    <div className="flex flex-col items-center justify-start py-4 px-3 max-w-xl mx-auto text-center my-auto font-sans">
      {/* Friendly Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-accent/30 mb-3 text-xs text-ink/90 font-medium">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span>Personal AI Assistant Ready</span>
      </div>
      
      <h2 className="text-xl md:text-2xl font-bold tracking-tight text-ink mb-1.5 font-sans">
        How can I help you today?
      </h2>
      <p className="text-xs text-muted mb-5 max-w-md leading-relaxed">
        Ask a question, search the web, open apps, or automate tasks on your PC.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full text-left">
        {STARTER_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.prompt)}
            className="group p-3 rounded-2xl border border-line bg-surface/80 hover:bg-surface-2 hover:border-accent/40 transition-all duration-200 cursor-pointer flex flex-col justify-between text-left shadow-xs"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="p-1.5 rounded-xl bg-surface-2 group-hover:bg-surface border border-line group-hover:border-accent/30 transition-colors">
                {item.icon}
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-2 border border-line/60 text-muted">
                {item.tag}
              </span>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-ink group-hover:text-accent transition-colors font-sans">
                {item.title}
              </h3>
              <p className="text-[11px] text-muted line-clamp-2 mt-0.5 leading-relaxed font-sans">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
