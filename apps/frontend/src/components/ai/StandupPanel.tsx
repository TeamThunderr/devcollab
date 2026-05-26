/**
 * apps/frontend/src/components/ai/StandupPanel.tsx
 *
 * AI standup generator — streams a daily standup report from task activity.
 */

import React, { useState } from "react";
import { useAIStream } from "../../hooks/useAIStream";
import StreamingText from "./StreamingText";

// ─── Props ──────────────────────────────────────────────────────────────────────────────

interface StandupPanelProps {
  projectId: string;
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


export default function StandupPanel({ projectId }: StandupPanelProps): React.ReactElement {
  const { content, isStreaming, error, startStream } = useAIStream();
  const [copied, setCopied] = useState(false);

  function handleGenerate(): void {
    void startStream("/api/ai/standup", { projectId });
  }

  function handleCopy(): void {
    void navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
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
            className="text-amber-500"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Standup Generator
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
          Generates today&apos;s standup from the last 24 hours of task activity
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isStreaming}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                     bg-amber-500 hover:bg-amber-600 active:bg-amber-700
                     text-white transition-colors duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStreaming ? (
            <>
              <Spinner />
              Generating...
            </>
          ) : (
            "☀️ Generate Standup"
          )}
        </button>

        {content && !isStreaming && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg
                       bg-gray-100 dark:bg-gray-800
                       text-gray-700 dark:text-gray-300
                       hover:bg-gray-200 dark:hover:bg-gray-700
                       transition-colors duration-150"
          >
            {copied ? "✅ Copied!" : "📋 Copy"}
          </button>
        )}
      </div>

      {/* Result */}
      <StreamingText
        content={content}
        isStreaming={isStreaming}
        error={error}
        emptyMessage="Click Generate to create today's standup report..."
      />
    </div>
  );
}
