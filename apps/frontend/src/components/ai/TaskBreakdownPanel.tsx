/**
 * apps/frontend/src/components/ai/TaskBreakdownPanel.tsx
 *
 * AI feature → subtasks breakdown.
 * Sends a feature description to the backend and renders
 * the returned JSON task array as Kanban-ready cards.
 */

import React, { useState } from "react";
import useTaskStore from "../../stores/taskStore";
import useAuthStore from "../../stores/authStore";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
const TEST_PROJECT_ID = "project-test-456";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedTask {
  title: string;
  description: string;
  priority: "P0" | "P1" | "P2";
}

const PRIORITY_STYLES: Record<GeneratedTask["priority"], string> = {
  P0: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  P1: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  P2: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
};

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

interface TaskBreakdownPanelProps {
  projectId: string;
}

export default function TaskBreakdownPanel({ projectId }: TaskBreakdownPanelProps): React.ReactElement {
  const addTask = useTaskStore((s) => s.addTask);
  const currentUser = useAuthStore((s) => s.user);

  const [featureDescription, setFeatureDescription] = useState("");
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
        body: JSON.stringify({
          featureDescription,
          projectId,
        }),
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

  function handleAddToBoard(): void {
    const now = new Date().toISOString();
    generatedTasks.forEach((task, index) => {
      addTask({
        id: `ai-${Date.now()}-${index}`,
        projectId,
        title: task.title,
        description: task.description,
        status: "TODO",
        priority: task.priority,
        dueDate: undefined,
        createdBy: {
          id: currentUser?.id || "unknown",
          name: currentUser?.name || "Unknown",
          email: currentUser?.email || "Unknown",
        },
        comments: [],
        createdAt: now,
        updatedAt: now,
      });
    });
    setAdded(true);
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
            className="text-green-500"
            aria-hidden="true"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Task Breakdown
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
          Describe a feature and AI will break it into subtasks
        </p>
      </div>

      {/* Input */}
      <textarea
        value={featureDescription}
        onChange={(e) => setFeatureDescription(e.target.value)}
        placeholder="e.g. Build a real-time notification system with email fallback..."
        rows={4}
        className="w-full resize-none min-h-24
                   border border-gray-300 dark:border-gray-700
                   bg-white dark:bg-gray-800
                   text-gray-800 dark:text-gray-200
                   placeholder-gray-400 dark:placeholder-gray-600
                   rounded-xl p-3 text-sm
                   focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      {/* Action button */}
      <button
        type="button"
        onClick={() => void handleBreakdown()}
        disabled={isLoading || featureDescription.trim().length < 10}
        className="flex items-center gap-2 w-fit px-4 py-2 text-sm font-medium rounded-lg
                   bg-green-600 hover:bg-green-700 active:bg-green-800
                   text-white transition-colors duration-150
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Spinner />
            Breaking down...
          </>
        ) : (
          "⚡ Break Down Feature"
        )}
      </button>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Generated tasks */}
      {generatedTasks.length > 0 && (
        <div className="space-y-3">
          {/* Tasks header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {generatedTasks.length} tasks generated
            </span>
            <button
              type="button"
              onClick={handleAddToBoard}
              disabled={added}
              className="px-3 py-1.5 text-xs font-medium rounded-lg
                         bg-green-600 hover:bg-green-700
                         text-white transition-colors duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {added ? "✅ Added!" : "Add all to board"}
            </button>
          </div>

          {/* Success banner */}
          {added && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-xs text-green-700 dark:text-green-300">
              ✅ {generatedTasks.length} tasks added to your Kanban board!
            </div>
          )}

          {/* Task cards */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {generatedTasks.map((task, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl
                           border border-gray-200 dark:border-gray-700
                           p-3 flex items-start gap-3"
              >
                {/* Priority badge */}
                <span
                  className={`flex-shrink-0 text-[10px] font-mono font-bold
                              px-2 py-0.5 rounded uppercase
                              ${PRIORITY_STYLES[task.priority]}`}
                >
                  {task.priority}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {task.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
