/**
 * apps/frontend/src/components/snippets/SnippetExplainModal.tsx
 *
 * Modal that auto-streams an AI explanation for a code snippet.
 * Opens → automatically calls /api/ai/explain-snippet → streams result.
 */

import React, { useEffect } from "react";
import { useAIStream } from "../../hooks/useAIStream";
import StreamingText from "../ai/StreamingText";
import { Snippet } from "../../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SnippetExplainModalProps {
  snippet: Snippet;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SnippetExplainModal({
  snippet,
  isOpen,
  onClose,
}: SnippetExplainModalProps): React.ReactElement | null {
  const { content, isStreaming, error, startStream, reset } = useAIStream();

  // Auto-start explanation when modal opens
  useEffect(() => {
    if (!isOpen || !snippet) return;
    reset();
    void startStream(`${API_BASE}/api/ai/explain-snippet`, {
      code: snippet.code,
      language: snippet.language,
      title: snippet.title,
    });
  }, [isOpen, snippet?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal panel — stop click propagation so clicking inside doesn't close */}
        <div
          className="bg-[#17191d] border border-white/[0.06] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04] flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm leading-none">🤖</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white leading-tight truncate">
                  AI Explanation
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {snippet.title} · {snippet.language}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         text-slate-500 hover:text-white hover:bg-white/[0.06]
                         transition-colors flex-shrink-0"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Streaming content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <StreamingText
              content={content}
              isStreaming={isStreaming}
              error={error}
              emptyMessage="Starting AI explanation…"
            />
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between flex-shrink-0">
            <span className="text-[10px] text-slate-600">Powered by Gemini</span>
            {!isStreaming && content && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  void startStream(`${API_BASE}/api/ai/explain-snippet`, {
                    code: snippet.code,
                    language: snippet.language,
                    title: snippet.title,
                  });
                }}
                className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors font-semibold"
              >
                Re-explain
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
