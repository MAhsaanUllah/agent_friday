import React from "react";
import { RefreshIcon, XIcon } from "./Icons";

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ResetModal({ isOpen, onClose, onConfirm }: ResetModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-accent/40 bg-surface p-5 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-accent/15 border border-accent/30 text-accent">
              <RefreshIcon className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-sm font-bold text-ink">
              Start New Chat
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-2">
          <p className="text-xs text-ink/90 leading-relaxed">
            Would you like to clear the current conversation and start fresh?
          </p>
          <p className="text-[11px] text-muted leading-relaxed">
            Don't worry — your saved rules and memory will remain safe on your PC.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:text-ink hover:bg-surface-2 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-black font-semibold text-xs transition-all shadow-sm cursor-pointer active:scale-95"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            <span>Start Fresh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
