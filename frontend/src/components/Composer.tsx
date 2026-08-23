import React, { useEffect, useRef, useState } from "react";
import { PlayIcon, XIcon } from "./Icons";

interface AttachedFile {
  name: string;
  size: number;
  content: string;
}

export function Composer({
  disabled,
  hint,
  onSubmit,
}: {
  disabled: boolean;
  hint?: string;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const reader = new FileReader();

    reader.onload = async () => {
      const rawContent = String(reader.result || "");
      let parsedText = rawContent;

      try {
        const res = await fetch("/agent/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            content: rawContent,
            is_base64: isPdf,
          }),
        });
        if (res.ok) {
          const resData = await res.json();
          parsedText = resData.text || resData.preview || rawContent;
        }
      } catch (err) {
        console.error("Upload error:", err);
      }

      setAttachedFile({ name: file.name, size: file.size, content: parsedText });
      setUploading(false);
    };

    reader.onerror = () => setUploading(false);

    if (isPdf) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }

    e.target.value = "";
  };

  const submit = () => {
    const trimmed = text.trim();
    if ((!trimmed && !attachedFile) || disabled) return;

    let finalPrompt = trimmed;
    if (attachedFile) {
      finalPrompt = `[Attached Document: ${attachedFile.name}]\n${attachedFile.content.slice(0, 10000)}\n\n${trimmed ? `User Query: ${trimmed}` : "Please analyze this attached document."}`;
    }

    onSubmit(finalPrompt);
    setText("");
    setAttachedFile(null);
  };

  return (
    <div className="w-full space-y-2">
      {/* Attached File Chip */}
      {attachedFile && (
        <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-accent/15 border border-accent/30 text-accent font-sans text-xs w-fit animate-in fade-in duration-150">
          <span className="text-sm">📎</span>
          <span className="font-semibold text-ink truncate max-w-[220px]">{attachedFile.name}</span>
          <span className="text-[10px] text-muted">({Math.round(attachedFile.size / 1024)} KB)</span>
          <button
            onClick={() => setAttachedFile(null)}
            className="p-0.5 rounded hover:bg-accent/20 text-muted hover:text-ink cursor-pointer ml-1"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2.5 rounded-2xl border border-line bg-surface-2/80 p-2.5 md:p-3 focus-within:border-accent focus-within:hud-glow-cyan transition-all shadow-inner">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Paperclip Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          title="Attach PDF resume, document, or code file"
          className="p-2 rounded-xl bg-surface border border-line/60 hover:border-accent/40 text-muted hover:text-accent transition-all cursor-pointer disabled:opacity-40 shrink-0 mb-0.5"
        >
          {uploading ? (
            <span className="w-4 h-4 block animate-spin text-xs">⏳</span>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </button>

        {/* Text Area */}
        <textarea
          ref={ref}
          rows={2}
          value={text}
          disabled={disabled}
          placeholder={hint ?? (attachedFile ? "Ask a question about the attached document (e.g. 'FIND OUT ATS SCORE')..." : "Ask Friday anything or attach a PDF document...")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-32 flex-1 resize-none bg-transparent text-xs md:text-sm font-sans text-ink outline-none placeholder:text-muted/60 leading-relaxed py-1"
        />
        
        {/* Engage Button */}
        <button
          onClick={submit}
          disabled={disabled || (!text.trim() && !attachedFile)}
          className="flex items-center gap-1.5 rounded-xl bg-accent hover:bg-accent-hover active:scale-95 text-black px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-cyan-900/30 shrink-0"
        >
          <PlayIcon className="w-4 h-4" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
