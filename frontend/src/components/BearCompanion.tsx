import React, { useState, useEffect } from "react";

interface BearCompanionProps {
  busy: boolean;
  awaitingApproval: boolean;
  progressText?: string;
}

export function BearCompanion({ busy, awaitingApproval, progressText }: BearCompanionProps) {
  const [posX, setPosX] = useState(25);
  const [direction, setDirection] = useState<"right" | "left">("right");
  const [waddle, setWaddle] = useState(false);
  const [jump, setJump] = useState(false);
  const [speech, setSpeech] = useState("Ice Bear is ready.");
  const [showBubble, setShowBubble] = useState(false);

  // Waddling patrol animation when busy or periodic walking
  useEffect(() => {
    if (!busy) {
      if (awaitingApproval) {
        setSpeech("Ice Bear needs your permission.");
        setShowBubble(true);
      } else {
        setShowBubble(false);
      }
      return;
    }

    setSpeech(progressText || "Ice Bear is executing mission...");
    setShowBubble(true);
    
    const interval = setInterval(() => {
      setWaddle((w) => !w);
      setPosX((prev) => {
        if (prev >= 82) {
          setDirection("left");
          return prev - 6;
        } else if (prev <= 8) {
          setDirection("right");
          return prev + 6;
        }
        return direction === "right" ? prev + 5 : prev - 5;
      });
    }, 350);

    return () => clearInterval(interval);
  }, [busy, awaitingApproval, direction, progressText]);

  const handlePoke = () => {
    setJump(true);
    const phrases = [
      "Hi there! 👋",
      "Ice Bear approves. ✨",
      "Keep up the great work! 🐻",
      "Ice Bear is here for you."
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)] ?? "Hi there! 👋";
    setSpeech(phrase);
    setShowBubble(true);
    
    setTimeout(() => {
      setJump(false);
      if (!busy && !awaitingApproval) {
        setTimeout(() => setShowBubble(false), 2000);
      }
    }, 700);
  };

  return (
    <div className="relative w-full h-24 overflow-hidden select-none pointer-events-auto px-4 flex items-end">
      {/* Ground Line */}
      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-line/60 rounded-full" />

      {/* Animated Full-Body Ice Bear Mascot */}
      <div
        onClick={handlePoke}
        style={{ left: `${posX}%` }}
        className={`absolute bottom-0.5 flex flex-col items-center cursor-pointer transition-all duration-300 z-50 ${
          jump ? "-translate-y-5 scale-110" : ""
        }`}
      >
        {/* Ice Bear Speech Bubble */}
        <div 
          className={`relative mb-1 px-2.5 py-1 rounded-xl bg-surface border border-accent/40 text-ink text-[10px] font-sans font-semibold shadow-md whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${
            showBubble ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <span className="text-accent font-bold">
            {busy ? "⚡" : awaitingApproval ? "⚠️" : "🐻"}
          </span>
          <span>{speech}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border-r border-b border-accent/40 rotate-45" />
        </div>

        {/* Full-Body Bear Graphic (Using User's Geometry with 3D Gradients) */}
        <div
          className={`relative w-[65px] h-[75px] transition-transform duration-200 ${
            direction === "left" ? "-scale-x-100" : "scale-x-100"
          } ${busy && waddle ? "rotate-3" : busy ? "-rotate-3" : ""}`}
        >
          <svg
            viewBox="0 0 200 220"
            xmlns="http://www.w3.org/2000/svg"
            className={`w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)] transition-all ${jump ? "drop-shadow-[0_16px_24px_rgba(0,0,0,0.35)]" : ""}`}
          >
            <defs>
              <radialGradient id="polarBodyGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="70%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </radialGradient>
            </defs>

            {/* Ears */}
            <circle cx="55" cy="45" r="18" fill="url(#polarBodyGrad)" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx="145" cy="45" r="18" fill="url(#polarBodyGrad)" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx="55" cy="45" r="10" fill="#f8fafc" opacity="0.8" />
            <circle cx="145" cy="45" r="10" fill="#f8fafc" opacity="0.8" />

            {/* Main Body / Head */}
            <path
              fill="url(#polarBodyGrad)"
              stroke="#cbd5e1"
              strokeWidth="2"
              d="M 45,70 C 45,20 155,20 155,70 C 155,110 170,140 170,180 C 170,210 140,210 100,210 C 60,210 30,210 30,180 C 30,140 45,110 45,70 Z"
            />

            {/* Paws */}
            <ellipse cx="40" cy="140" rx="12" ry="30" fill="url(#polarBodyGrad)" stroke="#cbd5e1" strokeWidth="2" transform="rotate(15 40 140)" />
            <ellipse cx="160" cy="140" rx="12" ry="30" fill="url(#polarBodyGrad)" stroke="#cbd5e1" strokeWidth="2" transform="rotate(-15 160 140)" />

            {/* Eyes */}
            <circle cx="78" cy="95" r="5" fill="#0f172a" />
            <circle cx="122" cy="95" r="5" fill="#0f172a" />
            
            {/* Blush (Happy state when jump/poke) */}
            <circle cx="68" cy="108" r="8" fill="#f43f5e" className={`transition-opacity duration-300 ${jump ? "opacity-40" : "opacity-0"}`} />
            <circle cx="132" cy="108" r="8" fill="#f43f5e" className={`transition-opacity duration-300 ${jump ? "opacity-40" : "opacity-0"}`} />

            {/* Nose & Mouth */}
            <ellipse cx="100" cy="108" rx="14" ry="10" fill="#0f172a" />
            <ellipse cx="97" cy="105" rx="4" ry="2.5" fill="#ffffff" opacity="0.6" />
            <path d="M 93,122 Q 100,117 107,122" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          </svg>
          
          {/* Turbo Puff when working */}
          {busy && (
            <span className="absolute -bottom-1 -left-2 text-[11px] opacity-85 animate-ping">
              💨
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
