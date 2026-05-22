/**
 * apps/frontend/src/components/editor/AIReviewBar.tsx
 *
 * Floating AI review bar docked to the bottom of the editor area.
 * Collapses to a slim strip; expands to show full streaming review results.
 */

import React, { useEffect, useState } from "react";
import { useAIStream } from "../../hooks/useAIStream";



// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIReviewBarProps {
  code: string;
  language: string;
  isVisible: boolean;
  onToggle: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }): React.ReactElement {
  const cls =
    score >= 8
      ? "bg-green-900 text-green-300"
      : score >= 6
      ? "bg-amber-900 text-amber-300"
      : "bg-red-900 text-red-300";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cls}`}>
      Score: {score}/10
    </span>
  );
}

function Spinner(): React.ReactElement {
  return (
    <svg
      className="animate-spin w-3 h-3"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ─── Markdown-like line renderer ──────────────────────────────────────────────


// ─── Main component ───────────────────────────────────────────────────────────

export default function AIReviewBar({
  code,
  language,
  isVisible,
}: AIReviewBarProps): React.ReactElement | null {
  const { content, isStreaming, reset, startStream } = useAIStream();
  const [score, setScore] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract SCORE:X when streaming ends
  useEffect(() => {
    if (!isStreaming && content) {
      const match = content.match(/SCORE:(\d+)/);
      if (match) setScore(parseInt(match[1], 10));
    }
  }, [isStreaming, content]);

  if (!isVisible) return null;

  function handleReview(): void {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";
    reset();
    setScore(null);
    setIsExpanded(true);
    void startStream(apiBase + "/api/ai/review-code", { code, language });
  }

  // ── Render content lines ─────────────────────────────────────────────────
  function renderContent(): React.ReactNode {
    const lines = content.split("\n");
    let inCode = false;
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
      if (line.startsWith("SCORE:")) return;

      if (line.startsWith("```")) {
        if (!inCode) {
          inCode = true;
          elements.push(
            <div
              key={`code-open-${i}`}
              className="font-mono text-xs bg-gray-800 rounded p-2 my-1 text-green-400"
            />
          );
        } else {
          inCode = false;
        }
        return;
      }

      if (inCode) {
        // Append to last code block
        const last = elements[elements.length - 1] as React.ReactElement;
        elements[elements.length - 1] = React.cloneElement(last, {
          children: (last.props.children ?? "") + line + "\n",
        });
        return;
      }

      if (line.startsWith("## ")) {
        elements.push(
          <h3 key={i} className="text-sm font-semibold text-white mt-3 mb-1">
            {line.slice(3)}
          </h3>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h4 key={i} className="text-xs font-semibold text-gray-300 mt-2 mb-1">
            {line.slice(4)}
          </h4>
        );
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        elements.push(
          <div key={i} className="flex items-start gap-1.5 my-0.5">
            <span className="w-1 h-1 rounded-full bg-gray-500 mt-1.5 flex-shrink-0" />
            <p className="text-xs text-gray-400">{line.slice(2)}</p>
          </div>
        );
      } else if (line.trim() === "") {
        elements.push(<div key={i} className="h-1" />);
      } else {
        elements.push(
          <p key={i} className="text-xs text-gray-400 leading-relaxed">
            {line}
          </p>
        );
      }
    });

    return elements;
  }

  return (
    <div className="flex-shrink-0">
      {/* ── Expanded panel ─────────────────────────────────────────────── */}
      {isExpanded && content && (
        <div
          className="max-h-64 overflow-y-auto
                     bg-gray-950 border-t border-gray-700 p-4"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-300">
              Review Results
            </span>
            <div className="flex items-center gap-2">
              {score !== null && <ScoreBadge score={score} />}
              <button
                type="button"
                onClick={handleReview}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Re-review
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-gray-500 hover:text-white text-sm leading-none
                           w-5 h-5 flex items-center justify-center
                           rounded hover:bg-gray-800 transition-colors"
                aria-label="Close review panel"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div>
            {renderContent()}
            {isStreaming && (
              <span
                className="inline-block w-1 h-3 bg-blue-400 animate-pulse ml-0.5"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Footer */}
          <div
            className="flex justify-between text-xs text-gray-600
                       mt-3 pt-3 border-t border-gray-800"
          >
            <span>Powered by Gemini</span>
            <span>AI reviews may contain errors — always verify</span>
          </div>
        </div>
      )}

      {/* ── Collapsed bar (always visible) ─────────────────────────────── */}
      <div
        className="h-10 bg-gray-900 border-t border-gray-700
                   flex items-center justify-between px-4"
      >
        {/* Left */}
        <div className="flex items-center gap-2">
          <span className="text-sm" aria-hidden="true">✨</span>
          <span className="text-xs text-gray-400">AI Code Review</span>
          {isStreaming && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400">Reviewing…</span>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {score !== null && !isExpanded && <ScoreBadge score={score} />}

          <button
            type="button"
            onClick={handleReview}
            disabled={isStreaming || !code.trim()}
            className="flex items-center gap-1.5 text-xs px-3 py-1
                       bg-blue-600 hover:bg-blue-700 text-white rounded-md
                       transition-colors duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <>
                <Spinner />
                Reviewing…
              </>
            ) : (
              "Review"
            )}
          </button>

          {content && (
            <button
              type="button"
              onClick={() => setIsExpanded((p) => !p)}
              className="text-gray-500 hover:text-white text-xs
                         px-1.5 py-1 rounded hover:bg-gray-800
                         transition-colors duration-150"
              aria-label={isExpanded ? "Collapse review" : "Expand review"}
            >
              {isExpanded ? "▼" : "▲"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
