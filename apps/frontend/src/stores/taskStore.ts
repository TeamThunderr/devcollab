/**
 * apps/frontend/src/stores/taskStore.ts
 *
 * Zustand store for Kanban tasks and comments.
 * Tasks are stored per-status bucket so the board can render columns directly.
 * Real-time updates from useTaskSync write into this store.
 */

import { create } from "zustand";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface TaskLabel {
  id: string;
  label: string;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "todo" | "inprogress" | "inreview" | "done";
  priority: "p0" | "p1" | "p2";
  assigneeId: string | null;
  dueDate: string | null;
  position: number;
  labels: TaskLabel[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: { name: string; avatar: string | null };
}

interface TaskStore {
  // ── State ──────────────────────────────────────────────────────────────────
  /** Tasks grouped by status, e.g. tasks["todo"] = [...] */
  tasks: Record<string, Task[]>;
  /** Comments grouped by taskId */
  comments: Record<string, Comment[]>;
  isLoading: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  setTasks: (tasksByStatus: Record<string, Task[]>) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  moveTask: (taskId: string, newStatus: string, newPosition: number) => void;
  deleteTask: (taskId: string) => void;
  addComment: (taskId: string, comment: Comment) => void;
  setLoading: (loading: boolean) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const useTaskStore = create<TaskStore>()((set) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  tasks: {},
  comments: {},
  isLoading: false,

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Replace the entire task map (used when fetching a project's tasks) */
  setTasks: (tasksByStatus) => set({ tasks: tasksByStatus }),

  /** Append a new task into its status bucket */
  addTask: (task) =>
    set((state) => {
      const bucket = state.tasks[task.status] ?? [];
      return {
        tasks: { ...state.tasks, [task.status]: [...bucket, task] },
      };
    }),

  /** Find a task by id across all status buckets and replace it in-place */
  updateTask: (task) =>
    set((state) => {
      const updatedBuckets: Record<string, Task[]> = {};
      for (const [status, bucket] of Object.entries(state.tasks)) {
        updatedBuckets[status] = bucket.map((t) =>
          t.id === task.id ? task : t
        );
      }
      return { tasks: updatedBuckets };
    }),

  /**
   * Move a task to a new status bucket.
   * 1. Find and remove it from its current bucket.
   * 2. Set the new status and position on the task object.
   * 3. Append to the new bucket (ordering is handled by position on render).
   */
  moveTask: (taskId, newStatus, newPosition) =>
    set((state) => {
      let movedTask: Task | null = null;
      const updatedBuckets: Record<string, Task[]> = {};

      for (const [status, bucket] of Object.entries(state.tasks)) {
        const idx = bucket.findIndex((t) => t.id === taskId);
        if (idx !== -1) {
          movedTask = { ...bucket[idx], status: newStatus as Task["status"], position: newPosition };
          updatedBuckets[status] = bucket.filter((t) => t.id !== taskId);
        } else {
          updatedBuckets[status] = bucket;
        }
      }

      if (!movedTask) return state; // task not found — no-op

      const targetBucket = updatedBuckets[newStatus] ?? [];
      updatedBuckets[newStatus] = [...targetBucket, movedTask];

      return { tasks: updatedBuckets };
    }),

  /** Remove a task by id from whichever status bucket it lives in */
  deleteTask: (taskId) =>
    set((state) => {
      const updatedBuckets: Record<string, Task[]> = {};
      for (const [status, bucket] of Object.entries(state.tasks)) {
        updatedBuckets[status] = bucket.filter((t) => t.id !== taskId);
      }
      return { tasks: updatedBuckets };
    }),

  /** Append a comment to a task's comment list */
  addComment: (taskId, comment) =>
    set((state) => {
      const existing = state.comments[taskId] ?? [];
      return {
        comments: { ...state.comments, [taskId]: [...existing, comment] },
      };
    }),

  setLoading: (loading) => set({ isLoading: loading }),
}));

export default useTaskStore;
