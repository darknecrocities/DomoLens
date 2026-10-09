import React from "react";

interface LlmMessageContentProps {
  content: string;
}

/**
 * Clean inline markdown parser for bold, italics, code, and quotes.
 * Eliminates raw asterisk artifacts (e.g. `**word**`, `*****`) and renders sleek typography.
 */
function renderInlineContent(text: string): React.ReactNode[] {
  // Clean up corrupted artifacts like ***** or ++++
  const sanitized = text
    .replace(/\*{3,}/g, "")
    .replace(/\+{2,}/g, "")
    .trim();

  // Tokenize for **bold**, *italic*, `code`, and "quoted" commands
  const tokens: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|"[^"]+")/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sanitized)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(sanitized.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      const inner = token.slice(2, -2);
      tokens.push(
        <strong key={`b-${match.index}`} className="font-semibold text-white">
          {inner}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const inner = token.slice(1, -1);
      tokens.push(
        <em key={`i-${match.index}`} className="italic text-neutral-300">
          {inner}
        </em>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const inner = token.slice(1, -1);
      tokens.push(
        <code
          key={`c-${match.index}`}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-neutral-200 border border-white/5"
        >
          {inner}
        </code>,
      );
    } else if (token.startsWith('"') && token.endsWith('"')) {
      const inner = token.slice(1, -1);
      tokens.push(
        <span
          key={`q-${match.index}`}
          className="font-medium text-neutral-200 bg-neutral-800/80 px-1 py-0.5 rounded border border-neutral-700/80 text-[11px]"
        >
          "{inner}"
        </span>,
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < sanitized.length) {
    tokens.push(sanitized.slice(lastIndex));
  }

  return tokens;
}

/**
 * Renders structured markdown content from LLM messages into clean, high-contrast,
 * native UI typography. Removes raw markdown syntax and renders clean lists,
 * badges, and headers.
 */
export function LlmMessageContent({ content }: LlmMessageContentProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    const trimmed = rawLine.trim();

    if (!trimmed) {
      renderedElements.push(<div key={`sp-${i}`} className="h-1.5" />);
      continue;
    }

    // Horizontal Rule / Divider (e.g. --- or *** or *****)
    if (/^[-*_]{3,}$/.test(trimmed)) {
      renderedElements.push(
        <div key={`hr-${i}`} className="my-2 border-t border-ink-800/80" />,
      );
      continue;
    }

    // Major Section Heading (e.g. # Title, ## Subtitle, ### Section)
    const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headerMatch) {
      const headerText = headerMatch[2] ?? "";
      renderedElements.push(
        <div
          key={`hdr-${i}`}
          className="my-1.5 flex items-center gap-1.5 font-semibold text-white text-xs border-b border-ink-800/60 pb-1"
        >
          {renderInlineContent(headerText)}
        </div>,
      );
      continue;
    }

    // Numbered step list (e.g. "1. Focus: ...")
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      const stepNum = numberedMatch[1] ?? "";
      const stepBody = numberedMatch[2] ?? "";
      renderedElements.push(
        <div key={`num-${i}`} className="my-1 flex items-start gap-2 text-xs">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-bold text-neutral-200 border border-neutral-700">
            {stepNum}
          </span>
          <div className="flex-1 leading-relaxed text-neutral-200">
            {renderInlineContent(stepBody)}
          </div>
        </div>,
      );
      continue;
    }

    // Bullet point list (e.g. "• Item", "- Item", "* Item")
    const bulletMatch = trimmed.match(/^([•\-\*])\s+(.+)/);
    if (bulletMatch) {
      const bulletBody = bulletMatch[2] ?? "";
      renderedElements.push(
        <div key={`bl-${i}`} className="my-0.5 flex items-start gap-2 text-xs">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white/70" />
          <div className="flex-1 leading-relaxed text-neutral-200">
            {renderInlineContent(bulletBody)}
          </div>
        </div>,
      );
      continue;
    }

    // Standard paragraph line
    renderedElements.push(
      <p key={`p-${i}`} className="my-0.5 leading-relaxed text-neutral-200 text-xs">
        {renderInlineContent(trimmed)}
      </p>,
    );
  }

  return <div className="space-y-0.5 select-text">{renderedElements}</div>;
}
