/**
 * apps/frontend/src/hooks/useAIStream.ts
 *
 * Consumes a Server-Sent Events streaming response from the AI backend.
 * Works with any SSE endpoint that emits:
 *   data: {"text":"..."}\n\n
 *   data: [DONE]\n\n
 */

import { useState, useCallback } from "react";
import useAuthStore from "../stores/authStore";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseAIStreamReturn {
  content: string;
  isStreaming: boolean;
  error: string | null;
  startStream: (endpoint: string, body: object) => Promise<void>;
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAIStream(): UseAIStreamReturn {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setContent("");
    setError(null);
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (endpoint: string, body: object): Promise<void> => {
      // Reset state before starting a new stream
      setContent("");
      setError(null);
      setIsStreaming(true);

      const token = useAuthStore.getState().accessToken;

      try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token ?? ""}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder();
        let done = false;

        outer: while (!done) {
          const result = await reader.read();
          done = result.done;

          if (result.done) break;

          const chunk = decoder.decode(result.value, { stream: true });

          // Each SSE event is separated by \n\n; one chunk may contain multiple
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const dataStr = line.replace("data: ", "").trim();

            if (dataStr === "[DONE]") break outer;

            try {
              const parsed = JSON.parse(dataStr) as {
                text?: string;
                error?: string;
              };

              if (parsed.error) {
                setError(parsed.error);
                break outer;
              }

              if (parsed.text) {
                setContent((prev) => prev + parsed.text);
              }
            } catch {
              // Malformed JSON line — skip silently
            }
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { content, isStreaming, error, startStream, reset };
}
