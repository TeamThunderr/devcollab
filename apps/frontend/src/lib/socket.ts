/**
 * apps/frontend/src/lib/socket.ts
 *
 * Socket.IO client singleton.
 * - Created once at module load with autoConnect: false
 * - connectSocket() is called after login/refresh with JWT + workspaceId
 * - disconnectSocket() is called ONLY on logout
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
  "chat:join": (payload: { projectId: string }) => void;
  "chat:leave": (payload: { projectId: string }) => void;
  "chat:typing": (payload: { projectId: string }) => void;
  "chat:stop-typing": (payload: { projectId: string }) => void;
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
  "chat:joined": (data: { projectId: string }) => void;
  "message:new": (data: any) => void;
  "message:edited": (data: any) => void;
  "message:deleted": (data: any) => void;
  "message:reaction": (data: any) => void;
  "chat:typing": (data: any) => void;
  "chat:stop-typing": (data: any) => void;
  "snippet:created": (data: unknown) => void;
  "snippet:updated": (data: unknown) => void;
  "snippet:deleted": (data: { snippetId: string }) => void;
  "project:member:assigned": (data: any) => void;
  "project:member:removed": (data: any) => void;
  "project:access:revoked": (data: any) => void;
  error: (data: { message: string }) => void;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  SOCKET_URL,
  {
    autoConnect: false,          // Connect manually after login
    auth: { token: "", workspaceId: "" }, // Populated by connectSocket()
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    transports: ["websocket"],
  }
);

// ─── Lifecycle logs ──────────────────────────────────────────────────────────

socket.on("connect", () => {
  console.log(`✅ Socket connected: ${socket.id}`);
});

socket.on("disconnect", (reason) => {
  console.log(`❌ Socket disconnected: ${reason}`);
});

socket.on("connect_error", (err: Error) => {
  console.warn(`⚠️ Socket connect_error: ${err.message}`);
});

// ─── Global notification listener ────────────────────────────────────────────
// Set up once at module load. Zustand's getState() is safe outside React.

socket.on("notification:new", (data: unknown) => {
  useRealtimeStore.getState().addNotification(data as Notification);
});

// ─── Exported helpers ────────────────────────────────────────────────────────

/**
 * Inject the JWT and workspaceId into the socket auth, then connect.
 * Safe to call multiple times — no-ops if already connected to same workspace.
 * If connected to a DIFFERENT workspace, disconnects first then reconnects.
 */
export function connectSocket(token: string, workspaceId: string): void {
  if (!token || !workspaceId) return;

  const auth = socket.auth as { token: string; workspaceId: string };

  // Already connected to this exact workspace — nothing to do
  if (socket.connected && auth.workspaceId === workspaceId) {
    // Token may have refreshed — update it silently
    auth.token = token;
    return;
  }

  // Switching workspaces — disconnect first
  if (socket.connected && auth.workspaceId !== workspaceId) {
    socket.disconnect();
  }

  // Set credentials and connect
  socket.auth = { token, workspaceId };
  socket.connect();
  console.log(`🔌 Socket connecting to workspace ${workspaceId}…`);
}

/**
 * Update the access token on the socket auth object (e.g. after a silent
 * token refresh). If the socket has a workspaceId but is not connected,
 * this will trigger a reconnect with the new token.
 */
export function updateSocketToken(token: string): void {
  if (!token) return;
  const auth = socket.auth as { token: string; workspaceId: string };
  auth.token = token;

  // If we have a workspace context but the socket fell off, reconnect now
  if (!socket.connected && auth.workspaceId) {
    socket.connect();
    console.log("🔄 Socket reconnecting after token refresh…");
  }
}

/**
 * Gracefully disconnect the socket.
 * ONLY call this on explicit logout — not on component unmount.
 */
export function disconnectSocket(): void {
  const auth = socket.auth as { token: string; workspaceId: string };
  // Clear credentials so reconnection logic won't re-connect automatically
  auth.token = "";
  auth.workspaceId = "";
  socket.disconnect();
  console.log("🔌 Socket disconnected (logout)");
}

/**
 * Returns true when the socket has an active connection.
 */
export function isConnected(): boolean {
  return socket.connected;
}
