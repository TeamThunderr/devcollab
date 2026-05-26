/**
 * apps/frontend/src/components/ai/WikiPlanPanel.tsx
 *
 * Reads all wiki pages for the project via POST /api/ai/wiki-plan (SSE),
 * streams a week-by-week delivery plan, then shows how many tasks were
 * auto-created on the board.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Lightbulb,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import useAuthStore from "../../stores/authStore";
import { toast } from "../../stores/toastStore";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WikiPlanPanelProps {
  projectId: string;
  workspaceId: string;
}

// ─── Phase state ──────────────────────────────────────────────────────────────

type Phase = "idle" | "generating" | "creating_tasks" | "done" | "error";

// ─── Streaming content renderer ───────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }): React.ReactElement {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  lines.forEach((line, idx) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={"code-" + idx}
            className="font-mono text-xs bg-black/40 rounded-lg p-3 my-2 overflow-x-auto text-green-400 whitespace-pre-wrap"
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
        <h2 key={idx} className="text-sm font-bold text-white mt-5 mb-2 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-indigo-500 flex-shrink-0" />
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={idx} className="text-xs font-semibold text-slate-300 mt-3 mb-1">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={idx} className="flex gap-2 text-xs text-slate-400 leading-relaxed my-0.5">
          <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={idx} className="text-xs font-semibold text-slate-200 mt-2">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.trim()) {
      elements.push(
        <p key={idx} className="text-xs text-slate-400 leading-relaxed">
          {line}
        </p>
      );
    } else {
      elements.push(<div key={idx} className="h-1.5" />);
    }
  });

  return <div className="flex flex-col gap-0.5">{elements}</div>;
}

// ─── Thinking indicator ───────────────────────────────────────────────────────

function ThinkingIndicator(): React.ReactElement {
  return (
    <div className="flex items-center gap-2 py-4 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
      <span className="text-xs font-medium">Gemini is thinking</span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-violet-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WikiPlanPanel({
  projectId,
  workspaceId,
}: WikiPlanPanelProps): React.ReactElement {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [planContent, setPlanContent] = useState("");
  const [tasksCreated, setTasksCreated] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const successBannerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to tasks banner after creation
  useEffect(() => {
    if (tasksCreated > 0 && successBannerRef.current) {
      successBannerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [tasksCreated]);

  const handleGenerate = useCallback(async () => {
    setPhase("generating");
    setPlanContent("");
    setTasksCreated(0);
    setErrorMsg("");

    const token = useAuthStore.getState().accessToken;

    try {
      const response = await fetch(`${API_BASE}/api/ai/wiki-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          (errBody as { error?: string }).error ??
            `Request failed: ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();

          if (dataStr === "[DONE]") {
            setPhase("done");
            break outer;
          }

          try {
            const parsed = JSON.parse(dataStr) as {
              text?: string;
              type?: string;
              count?: number;
              tasks?: unknown[];
              error?: string;
            };

            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.type === "tasks_created") {
              const count = parsed.count ?? 0;
              setTasksCreated(count);
              setPhase("creating_tasks");
              // Fire success toast
              toast.success(
                "Tasks added!",
                `${count} task${count !== 1 ? "s" : ""} are now on your board`
              );
              setTimeout(() => setPhase("done"), 1500);
            } else if (parsed.text) {
              accumulated += parsed.text;
              setPlanContent(accumulated);
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
      setPhase("error");
      toast.error("Generation failed", message);
    }
  }, [projectId]);

  const isActive = phase === "generating" || phase === "creating_tasks";

  const buttonLabel = {
    idle:          "Generate Plan from Wiki",
    generating:    "Reading wiki & generating plan…",
    creating_tasks:"Creating tasks on board…",
    done:          "Generate again",
    error:         "Retry",
  }[phase];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white leading-tight">Wiki Plan Generator</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            AI reads your wiki requirements and builds a delivery plan
          </p>
        </div>
      </div>

      {/* How it works — only when idle with no content */}
      {phase === "idle" && !planContent && (
        <div className="rounded-xl bg-blue-500/[0.06] border border-blue-500/[0.15] p-4">
          <p className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            How it works
          </p>
          <ol className="flex flex-col gap-1.5">
            {[
              "Write your project requirements in the Wiki",
              "Click Generate — AI reads all your wiki pages",
              "Get a week-by-week delivery plan",
              "Tasks are auto-added to your board for all team members",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Error banner */}
      {phase === "error" && errorMsg && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={isActive}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                   bg-gradient-to-r from-blue-600 to-purple-600
                   hover:from-blue-500 hover:to-purple-500
                   active:from-blue-700 active:to-purple-700
                   text-white font-semibold text-sm
                   transition-all duration-200
                   disabled:opacity-60 disabled:cursor-not-allowed
                   shadow-lg shadow-blue-500/20"
      >
        {isActive ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : phase === "done" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <ClipboardList className="w-4 h-4" />
        )}
        {buttonLabel}
      </button>

      {/* Streaming plan output */}
      {(planContent || isActive) && (
        <div className="rounded-xl bg-[#0e0f12] border border-white/[0.05] p-4 overflow-y-auto max-h-96">
          {isActive && planContent.length === 0 ? (
            <ThinkingIndicator />
          ) : (
            <>
              <MarkdownContent content={planContent} />
              {isActive && (
                <span
                  className="inline-block w-1 h-3 bg-violet-400 animate-pulse ml-0.5 mt-1 rounded-sm"
                  aria-hidden="true"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Tasks created success banner */}
      {tasksCreated > 0 && (
        <div
          ref={successBannerRef}
          className="rounded-xl bg-emerald-500/[0.07] border border-emerald-500/[0.20] p-4 flex flex-col gap-3"
        >
          <div>
            <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {tasksCreated} task{tasksCreated !== 1 ? "s" : ""} added to your board!
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              They're live for all team members right now.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/w/${workspaceId}/p/${projectId}/board`)}
            className="self-start flex items-center gap-1.5 px-4 py-2 rounded-lg
                       bg-emerald-600 hover:bg-emerald-500
                       text-white font-semibold text-xs
                       transition-colors duration-150
                       shadow-md shadow-emerald-900/30"
          >
            View Board
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
