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
    console.log('Review clicked, code length:', code?.length);
    if (!code || code.trim().length < 5) return;
    const lang = (!language || language === 'plaintext') ? 'javascript' : language;
    reset();
    setScore(null);
    setIsExpanded(true);
    void startStream('/api/ai/review-code', { code, language: lang });
  }

  function renderContent(): React.ReactNode {
    const lines = content.split("\n");
    let inCodeBlock = false;
    let codeLines: string[] = [];
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      // Skip the SCORE line (shown in badge instead)
      if (line.startsWith("SCORE:")) return;

      if (line.startsWith("```")) {
        if (inCodeBlock) {
          // Close code block
          elements.push(
            <pre
              key={"code-" + idx}
              className="font-mono text-xs bg-gray-800 rounded-lg p-3 my-2 overflow-x-auto text-green-400 whitespace-pre-wrap"
            >
              <code>{codeLines.join("\n")}</code>
            </pre>
          );
          codeLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      if (line.startsWith("## ")) {
        elements.push(
          <h3 key={idx} className="text-sm font-semibold text-white mt-3 mb-1">
            {line.slice(3)}
          </h3>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h4 key={idx} className="text-xs font-semibold text-gray-300 mt-2 mb-1">
            {line.slice(4)}
          </h4>
        );
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        elements.push(
          <div key={idx} className="flex gap-2 text-xs text-gray-400 leading-relaxed my-0.5">
            <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
      } else if (line.trim()) {
        elements.push(
          <p key={idx} className="text-xs text-gray-400 leading-relaxed">
            {line}
          </p>
        );
      } else {
        elements.push(<div key={idx} className="h-1" />);
      }
    });

    return <div className="flex flex-col gap-1">{elements}</div>;
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
            disabled={isStreaming || !code || code.trim().length < 5}
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-md
                       transition-colors duration-150
                       ${
                         isStreaming || !code || code.trim().length < 5
                           ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                           : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                       }`}
          >
            {isStreaming ? (
              <>
                <Spinner />
                Reviewing…
              </>
            ) : !code || code.trim().length < 5 ? (
              'No file'
            ) : (
              'Review'
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
