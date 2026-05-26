/**
 * apps/frontend/src/components/ai/ProjectSummaryPanel.tsx
 *
 * AI project health summariser — streams a project status report.
 */

import React from "react";
import { useAIStream } from "../../hooks/useAIStream";
import StreamingText from "./StreamingText";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectSummaryPanelProps {
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


export default function ProjectSummaryPanel({ projectId }: ProjectSummaryPanelProps): React.ReactElement {
  const { content, isStreaming, error, startStream, reset } = useAIStream();

  function handleSummarise(): void {
    void startStream("/api/ai/summarise-project", { projectId });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
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
          className="text-purple-500"
          aria-hidden="true"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Project Summariser
        </h3>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-950/40 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
        AI reads all your project tasks and generates a health report including
        blockers, velocity, and risks.
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSummarise}
          disabled={isStreaming}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                     bg-purple-600 hover:bg-purple-700 active:bg-purple-800
                     text-white transition-colors duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStreaming ? (
            <>
              <Spinner />
              Analysing...
            </>
          ) : (
            "📊 Summarise Project"
          )}
        </button>

        {content && !isStreaming && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-500 dark:text-gray-400
                       hover:text-gray-700 dark:hover:text-gray-200
                       transition-colors duration-150"
          >
            Reset
          </button>
        )}
      </div>

      {/* Result */}
      <StreamingText
        content={content}
        isStreaming={isStreaming}
        error={error}
        emptyMessage="Click Summarise to get an AI health report of your project..."
      />
    </div>
  );
}
