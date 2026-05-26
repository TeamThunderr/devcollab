/**
 * apps/frontend/src/stores/realtimeStore.ts
 *
 * Zustand store for all real-time state: online users, notifications,
 * unread counts, and per-task viewer lists.
 */

import { create } from "zustand";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface OnlineUser {
  userId: string;
  name: string;
  avatar: string | null;
  projectId: string | null;
  lastSeen: string;
}

export interface Notification {
  id: string;
  type: "mention" | "assignment" | "task_moved" | "comment";
  title: string;
  body: string;
  read: boolean;
  relatedTaskId?: string;
  createdAt: string;
}

interface RealtimeStore {
  // ── State ──────────────────────────────────────────────────────────────────
  onlineUsers: OnlineUser[];
  notifications: Notification[];
  unreadCount: number;
  /** Map of taskId → array of users currently viewing that task */
  taskViewers: Record<string, OnlineUser[]>;

  // ── Actions ────────────────────────────────────────────────────────────────
  setOnlineUsers: (users: OnlineUser[]) => void;
  addNotification: (notification: Notification) => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  setTaskViewers: (taskId: string, users: OnlineUser[]) => void;
  addTaskViewer: (taskId: string, user: OnlineUser) => void;
  removeTaskViewer: (taskId: string, userId: string) => void;
  clearNotifications: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const useRealtimeStore = create<RealtimeStore>()((set) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  onlineUsers: [],
  notifications: [],
  unreadCount: 0,
  taskViewers: {},

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Replace the full online users list (called on every presence:update) */
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  /** Prepend a new notification and increment the unread badge */
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  /** Mark a single notification as read and decrement the unread counter */
  markRead: (notificationId) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === notificationId);
      if (!target || target.read) return state; // already read — no-op
      return {
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),

  /** Mark every notification as read and zero the badge */
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  /** Replace the viewer list for a task */
  setTaskViewers: (taskId, users) =>
    set((state) => ({
      taskViewers: { ...state.taskViewers, [taskId]: users },
    })),

  /** Add a viewer to a task's list (idempotent — skips duplicate userIds) */
  addTaskViewer: (taskId, user) =>
    set((state) => {
      const current = state.taskViewers[taskId] ?? [];
      if (current.some((u) => u.userId === user.userId)) return state;
      return {
        taskViewers: { ...state.taskViewers, [taskId]: [...current, user] },
      };
    }),

  /** Remove a viewer from a task's list by userId */
  removeTaskViewer: (taskId, userId) =>
    set((state) => {
      const current = state.taskViewers[taskId] ?? [];
      return {
        taskViewers: {
          ...state.taskViewers,
          [taskId]: current.filter((u) => u.userId !== userId),
        },
      };
    }),

  /** Clear all notifications (e.g. on logout) */
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}));

export default useRealtimeStore;
