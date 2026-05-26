/**
 * apps/frontend/src/components/ai/CodeReviewPanel.tsx
 *
 * AI code review feature — paste code, select language, get streaming feedback.
 */

import React, { useEffect, useState } from "react";
import { useAIStream } from "../../hooks/useAIStream";
import StreamingText from "./StreamingText";

// ─── Types ────────────────────────────────────────────────────────────────────

type Language =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "cpp"
  | "go";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
];

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }): React.ReactElement {
  const color =
    score >= 8
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
      : score >= 6
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";

  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>
      Score: {score}/10
    </span>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner(): React.ReactElement {
  return (
    <svg
      className="animate-spin w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8H4z"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CodeReviewPanel(): React.ReactElement {
  const { content, isStreaming, error, startStream, reset } = useAIStream();
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("javascript");
  const [score, setScore] = useState<number | null>(null);

  // Extract SCORE:X from content when streaming ends
  useEffect(() => {
    if (!isStreaming && content) {
      const match = content.match(/SCORE:(\d+)/);
      if (match) setScore(parseInt(match[1], 10));
    }
  }, [isStreaming, content]);

  function handleReview(): void {
    setScore(null);
    void startStream("/api/ai/review-code", { code, language });
  }

  function handleClear(): void {
    reset();
    setCode("");
    setScore(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500"
            aria-hidden="true"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Code Reviewer
          </h3>
        </div>
        {score !== null && <ScoreBadge score={score} />}
      </div>

      {/* Language selector */}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="text-xs border border-gray-300 dark:border-gray-700
                   bg-white dark:bg-gray-800
                   text-gray-700 dark:text-gray-300
                   rounded-lg px-3 py-1.5 w-fit
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Programming language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>

      {/* Code textarea — terminal look */}
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste your code here..."
        rows={8}
        className="font-mono text-xs w-full resize-y
                   bg-gray-950 text-green-400
                   border border-gray-700 rounded-lg p-3
                   placeholder-gray-600
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   min-h-40"
      />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleReview}
          disabled={isStreaming || !code.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                     bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                     text-white transition-colors duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStreaming ? (
            <>
              <Spinner />
              Reviewing...
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Review with AI
            </>
          )}
        </button>

        {(content || error) && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-500 dark:text-gray-400
                       hover:text-gray-700 dark:hover:text-gray-200
                       transition-colors duration-150"
          >
            Clear
          </button>
        )}
      </div>

      {/* Result */}
      <StreamingText
        content={content}
        isStreaming={isStreaming}
        error={error}
        emptyMessage="Paste code above and click Review to get AI feedback..."
      />
    </div>
  );
}
