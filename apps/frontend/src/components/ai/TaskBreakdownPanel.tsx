/**
 * apps/frontend/src/components/ai/TaskBreakdownPanel.tsx
 *
 * AI → Engineering Plan generator.
 * Sends a feature description to Gemini, renders Kanban-ready cards with
 * stagger animation, and persists tasks to DB on "Add to Board".
 * After adding, calls onTasksAdded so the parent can redirect to the board
 * with the new task IDs highlighted.
 */

import React, { useState } from "react";
import useTaskStore from "../../stores/taskStore";
import useAuthStore from "../../stores/authStore";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskBreakdownPanelProps {
  projectId: string;
  onTasksAdded?: (taskIds: string[]) => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedTask {
  title: string;
  description: string;
  priority: "P0" | "P1" | "P2";
}

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  GeneratedTask["priority"],
  { label: string; color: string; dot: string; badge: string }
> = {
  P0: {
    label: "Critical",
    color: "text-rose-400",
    dot: "bg-rose-500",
    badge: "bg-rose-500/15 border-rose-500/25 text-rose-400",
  },
  P1: {
    label: "High",
    color: "text-amber-400",
    dot: "bg-amber-500",
    badge: "bg-amber-500/15 border-amber-500/25 text-amber-400",
  },
  P2: {
    label: "Normal",
    color: "text-emerald-400",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400",
  },
};

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ size = "md" }: { size?: "sm" | "md" }): React.ReactElement {
  const cls = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  return (
    <svg className={`animate-spin ${cls}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ─── Thinking skeleton ────────────────────────────────────────────────────────

function ThinkingSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3 mt-4">
      {[80, 65, 90, 55, 75].map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="w-12 h-4 rounded bg-white/[0.06] flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded bg-white/[0.06]" style={{ width: `${w}%` }} />
            <div className="h-2.5 rounded bg-white/[0.04]" style={{ width: `${w - 20}%` }} />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
        <span className="text-[11px] text-slate-500 animate-pulse">Gemini is generating your engineering plan…</span>
      </div>
    </div>
  );
}

// ─── Task card with stagger ───────────────────────────────────────────────────

function TaskCardItem({
  task,
  index,
}: {
  task: GeneratedTask;
  index: number;
}): React.ReactElement {
  const prio = PRIORITY_CONFIG[task.priority];

  return (
    <div
      className="flex items-start gap-3 p-3.5 rounded-xl bg-[#1e2025] border border-white/[0.05] hover:border-white/[0.10] transition-all duration-200 group"
      style={{
        animationDelay: `${index * 60}ms`,
        animation: "slideUpFade 0.35s ease both",
      }}
    >
      {/* Priority badge */}
      <span
        className={`flex-shrink-0 flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-lg border ${prio.badge} mt-0.5`}
      >
        <span className={`w-1 h-1 rounded-full ${prio.dot}`} />
        {task.priority}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-snug group-hover:text-violet-200 transition-colors">
          {task.title}
        </p>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-medium">
          {task.description}
        </p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskBreakdownPanel({
  projectId,
  onTasksAdded,
}: TaskBreakdownPanelProps): React.ReactElement {
  const createTask = useTaskStore((s) => s.createTask);

  const [featureDescription, setFeatureDescription] = useState("");
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  async function handleBreakdown(): Promise<void> {
    setIsLoading(true);
    setError(null);
    setGeneratedTasks([]);
    setAdded(false);

    const token = useAuthStore.getState().accessToken;

    try {
      const response = await fetch(`${API_BASE}/api/ai/breakdown`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ featureDescription, projectId }),
      });

      const data = (await response.json()) as {
        success: boolean;
        data?: { tasks: GeneratedTask[] };
        error?: unknown;
      };

      if (data.success && data.data) {
        setGeneratedTasks(data.data.tasks);
      } else {
        setError("AI breakdown failed. Please try again.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddToBoard(): Promise<void> {
    setIsAdding(true);
    setError(null);
    const createdIds: string[] = [];

    try {
      for (const task of generatedTasks) {
        const created = await createTask({
          title: task.title,
          description: task.description,
          status: "TODO",
          priority: task.priority as "P0" | "P1" | "P2",
          projectId,
        });
        if (created?.id) createdIds.push(created.id);
      }
      setAdded(true);

      // Give the user a moment to see the success state, then redirect
      setTimeout(() => {
        onTasksAdded?.(createdIds);
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add tasks");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <>
      {/* Keyframe for stagger */}
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex flex-col gap-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h3 className="text-sm font-bold text-white">
              Generate Engineering Plan
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-6 leading-relaxed">
            Describe a feature and Gemini will break it into an actionable sprint-ready engineering plan
          </p>
        </div>

        {/* Input */}
        <textarea
          value={featureDescription}
          onChange={(e) => setFeatureDescription(e.target.value)}
          placeholder="e.g. Build a real-time notification system with email fallback and user preferences..."
          rows={4}
          className="w-full resize-none
                     border border-white/[0.08] bg-black/20
                     text-slate-200 placeholder-slate-600
                     rounded-xl p-3.5 text-sm font-medium
                     focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20
                     transition-all duration-150"
        />

        {/* CTA */}
        <button
          type="button"
          onClick={() => void handleBreakdown()}
          disabled={isLoading || featureDescription.trim().length < 10}
          className="flex items-center gap-2 w-fit px-5 py-2.5 text-sm font-bold rounded-xl
                     bg-gradient-to-r from-violet-600 to-indigo-600
                     hover:from-violet-500 hover:to-indigo-500
                     text-white shadow-lg shadow-violet-500/20
                     transition-all duration-150
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? (
            <>
              <Spinner />
              Generating plan…
            </>
          ) : (
            <>
              <span>⚡</span>
              Generate Engineering Plan
            </>
          )}
        </button>

        {/* Thinking skeleton */}
        {isLoading && <ThinkingSkeleton />}

        {/* Error */}
        {error && (
          <p className="text-sm text-rose-400 flex items-center gap-1.5">
            <span>⚠️</span> {error}
          </p>
        )}

        {/* Generated tasks */}
        {!isLoading && generatedTasks.length > 0 && (
          <div className="space-y-3">
            {/* Result header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">
                {generatedTasks.length} tasks generated
              </span>

              <button
                type="button"
                onClick={() => void handleAddToBoard()}
                disabled={added || isAdding}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl
                           transition-all duration-200 shadow-sm
                           ${added
                             ? "bg-green-500/20 border border-green-500/30 text-green-400 cursor-default"
                             : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-500/20 disabled:opacity-40"
                           }`}
              >
                {isAdding ? (
                  <>
                    <Spinner size="sm" />
                    Saving to board…
                  </>
                ) : added ? (
                  "✅ Added! Redirecting to Board…"
                ) : (
                  <>
                    <span>🚀</span>
                    Add all to Board
                  </>
                )}
              </button>
            </div>

            {/* Task cards with stagger */}
            <div className="space-y-2">
              {generatedTasks.map((task, i) => (
                <TaskCardItem key={i} task={task} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
