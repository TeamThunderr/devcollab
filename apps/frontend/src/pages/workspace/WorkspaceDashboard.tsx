// TEMP — replace with real implementation (real workspace data, proper kanban board)

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import useRealtimeStore from "../../stores/realtimeStore";
import { socket } from "../../lib/socket";
import OnlineAvatars from "../../components/presence/OnlineAvatars";
import NotificationBell from "../../components/notifications/NotificationBell";
import TaskViewers from "../../components/presence/TaskViewers";

const TEST_WORKSPACE_ID = "workspace-test-123";
const TEST_PROJECT_ID = "project-test-456";

// ─── Fake task data ───────────────────────────────────────────────────────────

interface FakeTask {
  id: string;
  title: string;
  status: "todo" | "inprogress" | "inreview" | "done";
  priority: "p0" | "p1" | "p2";
}

const FAKE_TASKS: FakeTask[] = [
  { id: "ft1", title: "Setup Redis adapter", status: "todo", priority: "p0" },
  { id: "ft2", title: "Write API docs", status: "todo", priority: "p1" },
  { id: "ft3", title: "Build Socket.IO rooms", status: "inprogress", priority: "p0" },
  { id: "ft4", title: "Presence system", status: "inprogress", priority: "p1" },
  { id: "ft5", title: "Frontend socket client", status: "inreview", priority: "p1" },
  { id: "ft6", title: "Review PR #42", status: "inreview", priority: "p2" },
  { id: "ft7", title: "Notification bell UI", status: "done", priority: "p2" },
  { id: "ft8", title: "Socket auth middleware", status: "done", priority: "p0" },
];

const COLUMNS: { key: FakeTask["status"]; label: string; color: string }[] = [
  { key: "todo", label: "Todo", color: "bg-gray-500" },
  { key: "inprogress", label: "In Progress", color: "bg-blue-500" },
  { key: "inreview", label: "In Review", color: "bg-amber-500" },
  { key: "done", label: "Done", color: "bg-green-500" },
];

const PRIORITY_STYLES: Record<FakeTask["priority"], string> = {
  p0: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  p1: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  p2: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
};

// ─── Component ────────────────────────────────────────────────────────────────
import { Link, useParams } from 'react-router-dom';

export default function WorkspaceDashboard(): React.ReactElement {
  const { user, isAuthenticated } = useAuthStore();
  const addNotification = useRealtimeStore((s) => s.addNotification);
  const [connected, setConnected] = useState(socket.connected);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Poll socket connection status every 2 seconds
  useEffect(() => {
    const interval = window.setInterval(() => {
      setConnected(socket.connected);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Please login first
        </p>
        <Link
          to="/login"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Go to Login →
        </Link>
      </div>
    );
  }

  function triggerTestNotification(): void {
    addNotification({
      id: Date.now().toString(),
      type: "mention",
      title: "Test Notification",
      body: "Someone mentioned you in a task",
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  function simulatePresencePing(): void {
    socket.emit("presence:ping", {
      workspaceId: TEST_WORKSPACE_ID,
      projectId: TEST_PROJECT_ID,
    });
  }

  const tasksByStatus = COLUMNS.reduce<Record<string, FakeTask[]>>((acc, col) => {
    acc[col.key] = FAKE_TASKS.filter((t) => t.status === col.key);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* ── Top section ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user.name} 👋
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Workspace: {TEST_WORKSPACE_ID}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <OnlineAvatars workspaceId={TEST_WORKSPACE_ID} projectId={TEST_PROJECT_ID} />
          <NotificationBell />

          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`}
            />
            <span className={connected ? "text-green-600 dark:text-green-400" : "text-red-500"}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </div>

      {/* Selected task viewer banner */}
      {selectedTaskId && (
        <div className="space-y-2">
          <TaskViewers taskId={selectedTaskId} />
          <button
            type="button"
            onClick={() => setSelectedTaskId(null)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕ Deselect task
          </button>
        </div>
      )}

      {/* ── Kanban preview ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className="bg-white dark:bg-gray-900
                       border border-gray-200 dark:border-gray-800
                       rounded-xl overflow-hidden"
          >
            {/* Column header */}
            <div className={`px-4 py-2.5 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.color}`} />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {col.label}
                </span>
              </div>
              <span className="text-xs text-gray-400 font-medium">
                {tasksByStatus[col.key]?.length ?? 0}
              </span>
            </div>

            {/* Tasks */}
            <div className="p-2 space-y-2">
              {(tasksByStatus[col.key] ?? []).map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelectedTaskId(task.id)}
                  className="w-full text-left p-3 rounded-lg
                             bg-gray-50 dark:bg-gray-800
                             hover:bg-gray-100 dark:hover:bg-gray-700
                             border border-gray-200 dark:border-gray-700
                             transition-colors duration-100 group"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">
                    {task.title}
                  </p>
                  <div className="mt-2">
                    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${PRIORITY_STYLES[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Test controls ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={triggerTestNotification}
          className="px-4 py-2 text-sm font-medium rounded-lg
                     bg-blue-600 hover:bg-blue-700 text-white
                     transition-colors duration-150"
        >
          🔔 Trigger Test Notification
        </button>
        <button
          type="button"
          onClick={simulatePresencePing}
          className="px-4 py-2 text-sm font-medium rounded-lg
                     bg-gray-700 hover:bg-gray-600 text-white
                     transition-colors duration-150"
        >
          👁 Simulate Presence Ping
        </button>
      </div>
    </div>
  );
}
