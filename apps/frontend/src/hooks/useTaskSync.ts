/**
 * apps/frontend/src/hooks/useTaskSync.ts
 *
 * Subscribes a component to real-time task and comment events for a project.
 *
 * On mount:
 *   - Emits "join:project" to enter the project's Socket.IO room
 *
 * Listens for:
 *   task:created         → taskStore.addTask
 *   task:updated         → taskStore.updateTask
 *   task:moved           → taskStore.moveTask
 *   task:deleted         → taskStore.deleteTask
 *   comment:new          → taskStore.addComment
 *   task:viewing         → realtimeStore.addTaskViewer
 *   task:stopped-viewing → realtimeStore.removeTaskViewer
 *
 * On unmount:
 *   - Emits "leave:project" to leave the Socket.IO room
 *   - Removes all event listeners (no memory leak)
 */

import { useEffect } from "react";
import { socket } from "../lib/socket";
import useTaskStore, { Task, Comment } from "../stores/taskStore";
import useRealtimeStore, { OnlineUser } from "../stores/realtimeStore";

// ─── Payload shapes from the server ──────────────────────────────────────────

interface TaskMovedPayload {
  taskId: string;
  status: string;
  position: number;
}

interface TaskDeletedPayload {
  taskId: string;
}

interface CommentNewPayload {
  taskId: string;
  comment: Comment;
}

interface TaskViewingPayload {
  taskId: string;
  user: OnlineUser;
}

interface TaskStoppedViewingPayload {
  taskId: string;
  userId: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTaskSync(projectId: string): void {
  const addTask = useTaskStore((s) => s.addTaskState);
  const updateTask = useTaskStore((s) => s.updateTaskState);
  const moveTask = useTaskStore((s) => s.moveTaskState);
  const deleteTask = useTaskStore((s) => s.deleteTaskState);
  const addComment = useTaskStore((s) => s.addCommentState);

  const addTaskViewer = useRealtimeStore((s) => s.addTaskViewer);
  const removeTaskViewer = useRealtimeStore((s) => s.removeTaskViewer);

  useEffect(() => {
    if (!projectId) return;

    // Join the project room so the server starts sending task events
    socket.emit("join:project", { projectId });

    // ── Task CRUD ─────────────────────────────────────────────────────────

    const onTaskCreated = (data: unknown) => {
      addTask(data as Task);
    };

    const onTaskUpdated = (data: unknown) => {
      updateTask(data as Task);
    };

    const onTaskMoved = (data: unknown) => {
      const { taskId, status, position } = data as TaskMovedPayload;
      moveTask(taskId, status, position);
    };

    const onTaskDeleted = (data: unknown) => {
      const { taskId } = data as TaskDeletedPayload;
      deleteTask(taskId);
    };

    const onCommentNew = (data: unknown) => {
      const { taskId, comment } = data as CommentNewPayload;
      addComment(taskId, comment);
    };

    // ── Task viewer presence ──────────────────────────────────────────────

    const onTaskViewing = (data: unknown) => {
      const { taskId, user } = data as TaskViewingPayload;
      addTaskViewer(taskId, user);
    };

    const onTaskStoppedViewing = (data: unknown) => {
      const { taskId, userId } = data as TaskStoppedViewingPayload;
      removeTaskViewer(taskId, userId);
    };

    // ── Register listeners ────────────────────────────────────────────────

    socket.on("task:created", onTaskCreated);
    socket.on("task:updated", onTaskUpdated);
    socket.on("task:moved", onTaskMoved);
    socket.on("task:deleted", onTaskDeleted);
    socket.on("comment:new", onCommentNew);
    socket.on("task:viewing", onTaskViewing);
    socket.on("task:stopped-viewing", onTaskStoppedViewing);

    // ── Cleanup ───────────────────────────────────────────────────────────

    return () => {
      socket.emit("leave:project", { projectId });

      socket.off("task:created", onTaskCreated);
      socket.off("task:updated", onTaskUpdated);
      socket.off("task:moved", onTaskMoved);
      socket.off("task:deleted", onTaskDeleted);
      socket.off("comment:new", onCommentNew);
      socket.off("task:viewing", onTaskViewing);
      socket.off("task:stopped-viewing", onTaskStoppedViewing);
    };
  }, [
    projectId,
    addTask,
    updateTask,
    moveTask,
    deleteTask,
    addComment,
    addTaskViewer,
    removeTaskViewer,
  ]);
}
