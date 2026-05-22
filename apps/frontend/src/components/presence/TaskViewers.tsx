/**
 * apps/frontend/src/components/presence/TaskViewers.tsx
 *
 * Shows a soft banner at the top of a task modal listing who is
 * concurrently viewing the same task.
 *
 * On mount → emit "join:task"
 * On unmount → emit "leave:task"
 */

import React, { useEffect } from "react";
import { socket } from "../../lib/socket";
import useRealtimeStore from "../../stores/realtimeStore";
import useAuthStore from "../../stores/authStore";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TaskViewersProps {
  taskId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildViewerLabel(names: string[], extraCount: number): string {
  const displayed = names.join(", ");
  if (extraCount <= 0) return `${displayed} ${names.length === 1 ? "is" : "are"} viewing this task`;
  return `${displayed} and ${extraCount} other${extraCount > 1 ? "s" : ""} are viewing this task`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TaskViewers({
  taskId,
}: TaskViewersProps): React.ReactElement | null {
  const currentUser = useAuthStore((s) => s.user);
  const taskViewers = useRealtimeStore((s) => s.taskViewers);

  // Join / leave the task room so the server tracks who is viewing
  useEffect(() => {
    if (!taskId) return;

    socket.emit("join:task", { taskId });

    return () => {
      socket.emit("leave:task", { taskId });
    };
  }, [taskId]);

  const viewers = (taskViewers[taskId] ?? []).filter(
    (u) => u.userId !== currentUser?.userId
  );

  if (viewers.length === 0) return null;

  const MAX_NAMED = 2;
  const namedViewers = viewers.slice(0, MAX_NAMED).map((u) => u.name);
  const extraCount = viewers.length - MAX_NAMED;

  const label = buildViewerLabel(namedViewers, extraCount > 0 ? extraCount : 0);

  return (
    <div
      className="flex items-center gap-2
                 bg-blue-50 dark:bg-blue-950
                 border border-blue-200 dark:border-blue-800
                 rounded-lg px-3 py-2
                 text-xs text-blue-700 dark:text-blue-300"
      role="status"
      aria-live="polite"
    >
      {/* Eye icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="flex-shrink-0"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>

      <span>{label}</span>
    </div>
  );
}
