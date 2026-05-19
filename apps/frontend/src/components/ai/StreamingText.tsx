/**
 * apps/frontend/src/components/ai/StreamingText.tsx
 *
 * Renders streaming AI text with basic markdown-like formatting.
 * Shows a blinking cursor while streaming is in progress.
 */

import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
  error: string | null;
  emptyMessage?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ParsedLine {
  type:
    | "h2"
    | "h3"
    | "bullet"
    | "code-fence"
    | "paragraph"
    | "blank";
  text: string;
}

function parseLine(raw: string): ParsedLine {
  if (raw.startsWith("## ")) return { type: "h2", text: raw.slice(3) };
  if (raw.startsWith("### ")) return { type: "h3", text: raw.slice(4) };
  if (raw.startsWith("- ")) return { type: "bullet", text: raw.slice(2) };
  if (raw.startsWith("```")) return { type: "code-fence", text: raw };
  if (raw.trim() === "") return { type: "blank", text: "" };
  return { type: "paragraph", text: raw };
}

/** Replace **bold** patterns inline */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StreamingText({
  content,
  isStreaming,
  error,
  emptyMessage = "Click generate to see results here...",
}: StreamingTextProps): React.ReactElement {
  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="min-h-32 p-4 rounded-xl
                   bg-red-50 dark:bg-red-950/30
                   border border-red-200 dark:border-red-800
                   flex items-start gap-2"
      >
        <span className="text-red-500 flex-shrink-0" aria-hidden="true">
          ⚠
        </span>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!content && !isStreaming) {
    return (
      <div
        className="min-h-32 p-4 rounded-xl
                   border-2 border-dashed border-gray-200 dark:border-gray-700
                   flex items-center justify-center"
      >
        <p className="text-sm text-gray-400 dark:text-gray-600 text-center">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // ── Content state ──────────────────────────────────────────────────────────
  const lines = content.split("\n");
  let inCodeBlock = false;
  const codeLines: string[] = [];

  const elements: React.ReactNode[] = [];

  lines.forEach((raw, idx) => {
    const parsed = parseLine(raw);

    if (parsed.type === "code-fence") {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines.length = 0;
      } else {
        // Close code block
        inCodeBlock = false;
        elements.push(
          <pre
            key={`code-${idx}`}
            className="font-mono text-xs
                       bg-gray-100 dark:bg-gray-800
                       rounded-lg p-3 my-2 overflow-x-auto
                       text-gray-800 dark:text-gray-200"
          >
            {codeLines.join("\n")}
          </pre>
        );
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(raw);
      return;
    }

    switch (parsed.type) {
      case "h2":
        elements.push(
          <h2
            key={idx}
            className="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2"
          >
            {renderInline(parsed.text)}
          </h2>
        );
        break;

      case "h3":
        elements.push(
          <h3
            key={idx}
            className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1"
          >
            {renderInline(parsed.text)}
          </h3>
        );
        break;

      case "bullet":
        elements.push(
          <div key={idx} className="flex items-start gap-2 my-0.5">
            <span
              className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 mt-2"
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
              {renderInline(parsed.text)}
            </p>
          </div>
        );
        break;

      case "blank":
        elements.push(<div key={idx} className="h-2" />);
        break;

      default:
        elements.push(
          <p
            key={idx}
            className="text-sm leading-relaxed text-gray-800 dark:text-gray-200"
          >
            {renderInline(parsed.text)}
          </p>
        );
    }
  });

  return (
    <div
      className="min-h-32 max-h-80 overflow-y-auto
                 p-4 rounded-xl
                 bg-gray-50 dark:bg-gray-900
                 border border-gray-200 dark:border-gray-800"
    >
      {elements}

      {/* Blinking cursor while streaming */}
      {isStreaming && (
        <span
          className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
