// TEMP — replace with real implementation (drag-and-drop kanban, task detail modal)

import React, { useEffect } from "react";
import { useTaskSync } from "../../hooks/useTaskSync";
import useTaskStore, { Task } from "../../stores/taskStore";
import { socket } from "../../lib/socket";

const PROJECT_ID = "project-test-456";

// ─── Seed data ────────────────────────────────────────────────────────────────

const now = new Date().toISOString();

const SEED_TASKS: Task[] = [
  {
    id: "t1",
    projectId: PROJECT_ID,
    title: "Setup Redis adapter",
    status: "todo",
    priority: "p0",
    position: 1,
    assigneeId: null,
    description: "",
    dueDate: null,
    labels: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "t2",
    projectId: PROJECT_ID,
    title: "Build Socket.IO rooms",
    status: "inprogress",
    priority: "p0",
    position: 1,
    assigneeId: null,
    description: "",
    dueDate: null,
    labels: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "t3",
    projectId: PROJECT_ID,
    title: "Presence system",
    status: "inprogress",
    priority: "p1",
    position: 2,
    assigneeId: null,
    description: "",
    dueDate: null,
    labels: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "t4",
    projectId: PROJECT_ID,
    title: "Frontend socket client",
    status: "inreview",
    priority: "p1",
    position: 1,
    assigneeId: null,
    description: "",
    dueDate: null,
    labels: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "t5",
    projectId: PROJECT_ID,
    title: "Notification bell UI",
    status: "done",
    priority: "p2",
    position: 1,
    assigneeId: null,
    description: "",
    dueDate: null,
    labels: [],
    createdAt: now,
    updatedAt: now,
  },
];

// ─── Column config ────────────────────────────────────────────────────────────

interface ColumnConfig {
  key: Task["status"];
  label: string;
  headerColor: string;
  badgeColor: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    key: "todo",
    label: "Todo",
    headerColor: "text-gray-600 dark:text-gray-400",
    badgeColor: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  },
  {
    key: "inprogress",
    label: "In Progress",
    headerColor: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  },
  {
    key: "inreview",
    label: "In Review",
    headerColor: "text-amber-600 dark:text-amber-400",
    badgeColor: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  },
  {
    key: "done",
    label: "Done",
    headerColor: "text-green-600 dark:text-green-400",
    badgeColor: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  },
];

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  p0: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  p1: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  p2: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
};

// ─── Component ────────────────────────────────────────────────────────────────
import ProjectsPage from './ProjectsPage';

export default function ProjectView(): React.ReactElement {
  const { tasks, setTasks } = useTaskStore();

  // Wire up real-time task events for this project
  useTaskSync(PROJECT_ID);

  // Seed store once on mount if not already seeded
  useEffect(() => {
    const alreadySeeded = tasks.length > 0;
    if (alreadySeeded) return;

    setTasks(SEED_TASKS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isConnected = socket.connected;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Project Board
        </h2>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span>{isConnected ? "🟢" : "🔴"}</span>
          <span className="text-gray-500 dark:text-gray-400">
            {isConnected ? "Syncing live" : "Not syncing"}
          </span>
        </div>
      </div>

      {/* Kanban grid */}
      <div className="grid grid-cols-4 gap-4 min-h-[60vh]">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((task) => task.status === col.key);
          return (
            <div
              key={col.key}
              className="flex flex-col
                         bg-white dark:bg-gray-900
                         border border-gray-200 dark:border-gray-800
                         rounded-xl overflow-hidden"
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3
                              border-b border-gray-100 dark:border-gray-800">
                <span className={`text-xs font-semibold uppercase tracking-wide ${col.headerColor}`}>
                  {col.label}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${col.badgeColor}`}>
                  {columnTasks.length}
                </span>
              </div>

              {/* Task list */}
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {columnTasks.length === 0 && (
                  <p className="text-xs text-center text-gray-400 dark:text-gray-600 py-6">
                    No tasks
                  </p>
                )}
                {columnTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => alert(`Task: ${task.title}`)}
                    className="w-full text-left p-3 rounded-lg
                               bg-gray-50 dark:bg-gray-800
                               hover:bg-gray-100 dark:hover:bg-gray-700
                               border border-gray-200 dark:border-gray-700
                               transition-colors duration-100"
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
          );
        })}
      </div>
    </div>
  );
}
