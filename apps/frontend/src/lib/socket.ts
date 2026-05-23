/**
 * apps/frontend/src/lib/socket.ts
 *
 * Socket.IO client singleton.
 * - Created once at module load with autoConnect: false
 * - connectSocket() is called after login with the JWT + workspaceId
 * - disconnectSocket() is called on logout
 */

import { io, Socket } from "socket.io-client";
import useRealtimeStore, { Notification } from "../stores/realtimeStore";

const SOCKET_URL = import.meta.env.VITE_API_URL || "";

// ─── Typed event maps (mirrors backend) ─────────────────────────────────────

// Events we send to the server
interface ClientToServerEvents {
  "join:project": (payload: { projectId: string }) => void;
  "leave:project": (payload: { projectId: string }) => void;
  "join:task": (payload: { taskId: string }) => void;
  "leave:task": (payload: { taskId: string }) => void;
  "presence:ping": (payload: {
    workspaceId: string;
    projectId?: string;
  }) => void;
}

// Events we receive from the server
interface ServerToClientEvents {
  "joined:project": (data: { projectId: string }) => void;
  "joined:task": (data: { taskId: string }) => void;
  "task:created": (data: unknown) => void;
  "task:updated": (data: unknown) => void;
  "task:moved": (data: unknown) => void;
  "task:deleted": (data: unknown) => void;
  "comment:new": (data: unknown) => void;
  "presence:update": (data: unknown) => void;
  "notification:new": (data: unknown) => void;
  "task:viewing": (data: unknown) => void;
  "task:stopped-viewing": (data: unknown) => void;
  error: (data: { message: string }) => void;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  SOCKET_URL,
  {
    autoConnect: false,          // Connect manually after login
    auth: { token: "" },         // Populated by connectSocket()
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ["websocket"],
  }
);

// ─── Lifecycle logs ──────────────────────────────────────────────────────────

socket.on("connect", () => {
  console.log(`✅ Socket connected: ${socket.id}`);
});

socket.on("disconnect", () => {
  console.log("❌ Socket disconnected");
});

socket.on("connect_error", (err: Error) => {
  console.log(`Socket error: ${err.message}`);
});

// ─── Global notification listener ────────────────────────────────────────────
// Set up once at module load. Zustand's getState() is safe outside React.

socket.on("notification:new", (data: unknown) => {
  useRealtimeStore.getState().addNotification(data as Notification);
});

// ─── Exported helpers ────────────────────────────────────────────────────────

/**
 * Inject the JWT and workspaceId into the socket auth object, then connect.
 * Call this immediately after a successful login.
 */
export function connectSocket(token: string, workspaceId: string): void {
  socket.auth = { token, workspaceId };
  socket.connect();
  console.log("Socket connecting...");
}

/**
 * Gracefully disconnect the socket.
 * Call this on logout or when the user leaves a workspace.
 */
export function disconnectSocket(): void {
  socket.disconnect();
  console.log("Socket disconnected");
}

/**
 * Returns true when the socket has an active connection.
 */
export function isConnected(): boolean {
  return socket.connected;
}
