import React from "react";

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  // Parse lines into structured elements
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === "ul") {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-4 list-disc marker:text-accent">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {formatInline(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 pl-4 list-decimal marker:text-accent font-mono">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed font-sans">
                {formatInline(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      flushList();
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${idx}`}
            className="my-2.5 p-3 rounded-xl bg-black/70 border border-line/80 font-mono text-xs text-accent overflow-x-auto leading-relaxed"
          >
            {codeBlockContent.join("\n")}
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={`hr-${idx}`} className="my-3 border-line/80" />);
      return;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={`h3-${idx}`} className="text-sm font-bold text-ink mt-3 mb-1.5 flex items-center gap-1.5 font-mono">
          <span className="text-accent">›</span>
          {formatInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={`h2-${idx}`} className="text-base font-black text-ink mt-3.5 mb-1.5 font-mono tracking-tight text-accent">
          {formatInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h2 key={`h1-${idx}`} className="text-lg font-black text-ink mt-4 mb-2 font-mono tracking-tight text-accent border-b border-line pb-1">
          {formatInline(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Unordered List
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, "");
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      return;
    }

    // Ordered List
    if (/^\d+\.\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s+/, "");
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      return;
    }

    // Empty line
    if (!trimmed) {
      flushList();
      return;
    }

    // Standard Paragraph
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="my-1.5 leading-relaxed text-ink/90 text-sm">
        {formatInline(line)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1 font-sans">{elements}</div>;
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and [links](url)
 */
function formatInline(text: string): React.ReactNode[] {
  // Regex token parser for bold, code, and links
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-surface-2 border border-line/60 font-mono text-xs text-accent font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const label = part.slice(1, part.indexOf("]("));
      const url = part.slice(part.indexOf("](") + 2, -1);
      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline hover:text-accent-hover font-semibold transition-colors"
        >
          {label}
        </a>
      );
    }
    return part;
  });
}
