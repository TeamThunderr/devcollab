/**
 * apps/backend/src/socket/socket.ts
 *
 * Socket.IO server with Redis pub/sub adapter for real-time collaboration.
 *
 * ─── SERVER LISTENS (client → server) ──────────────────────────────────────
 *   join:project    { projectId }                → joins room project:{projectId}
 *   leave:project   { projectId }                → leaves room project:{projectId}
 *   join:task       { taskId }                   → joins room task:{taskId}
 *   leave:task      { taskId }                   → leaves room task:{taskId}
 *   presence:ping   { workspaceId, projectId? }  → refreshes heartbeat in Redis
 *
 * ─── SERVER EMITS (server → client) ────────────────────────────────────────
 *   task:created         { task }           → to project:{id}
 *   task:updated         { task }           → to project:{id}
 *   task:moved           { task }           → to project:{id}
 *   task:deleted         { taskId }         → to project:{id}
 *   comment:new          { comment }        → to task:{id}
 *   presence:update      { users }          → to workspace:{id}
 *   notification:new     { notification }   → to user:{id}
 *   task:viewing         { taskId, user }   → to task:{id}
 *   task:stopped-viewing { taskId, userId } → to task:{id}
 */

import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "../redis/client";
import jwt from "jsonwebtoken";
import http from "http";
import {
  registerPresenceHandlers,
  handlePresenceDisconnect,
} from "./handlers/presence.handler";

// ─── Types ──────────────────────────────────────────────────────────────────

interface JwtPayload {
  userId: string;
  email: string;
  name?: string;
  avatar?: string;
}

interface SocketUser {
  userId: string;
  email: string;
  name?: string;
  avatar?: string;
}

// Socket.IO SocketData generic — defines the shape of socket.data
interface DevCollabSocketData {
  user: SocketUser;
  workspaceId: string;
  /** Tracks task rooms (e.g. "task:abc") the socket has joined for presence cleanup */
  activeTasks: Set<string>;
}

// ─── Socket.IO event maps ───────────────────────────────────────────────────

// Events the client sends to the server
interface ClientToServerEvents {
  "join:project": (payload: { projectId: string }) => void;
  "leave:project": (payload: { projectId: string }) => void;
  "join:task": (payload: { taskId: string }) => void;
  "leave:task": (payload: { taskId: string }) => void;
  "presence:ping": (payload: { workspaceId: string; projectId?: string }) => void;
}

// Events the server sends to the client
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
  // Allow any additional event emitted via the helper functions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [event: string]: (...args: any[]) => void;
}

// Inter-server events (used by Redis adapter for broadcasting)
type InterServerEvents = Record<string, never>;

// Convenience aliases for our typed Server and Socket instances
type DevCollabServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  DevCollabSocketData
>;
type DevCollabSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  DevCollabSocketData
>;

// ─── Module-level io instance ────────────────────────────────────────────────

let io: DevCollabServer;

// ─── Init ────────────────────────────────────────────────────────────────────

export async function initSocket(httpServer: http.Server): Promise<void> {
  // 1. Initialize Socket.IO server
  io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    DevCollabSocketData
  >(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
      credentials: true,
    },
    // WebSocket only to bypass Fastify HTTP request intercept
    transports: ["websocket"],
  });

  // 2. Attach Redis adapter if available
  if (redis) {
    try {
      const pubClient = redis.duplicate();
      const subClient = pubClient.duplicate();

      // Connect both clients since they inherit lazyConnect: true
      await Promise.all([
        pubClient.connect(),
        subClient.connect()
      ]);

      // Attach Redis adapter for horizontal scaling across multiple server instances
      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ Socket.IO server initialized with Redis adapter");
    } catch (err) {
      console.warn("⚠️ Redis adapter initialization failed. Socket.IO will run in standalone mode.");
    }
  } else {
    console.log("⚠️ Redis not available. Socket.IO initialized in standalone mode.");
  }

  // 3. JWT authentication middleware — runs before every connection is accepted
  io.use((socket: DevCollabSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;

      if (!token) {
        return next(new Error("unauthorized"));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error("JWT_SECRET is not configured");
        return next(new Error("server_error"));
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;

      if (!decoded.userId || !decoded.email) {
        return next(new Error("unauthorized"));
      }

      socket.data.user = {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        avatar: decoded.avatar,
      };

      return next();
    } catch (err) {
      console.error("Socket auth error:", err);
      return next(new Error("unauthorized"));
    }
  });

  // 4. Connection handler
  io.on("connection", (socket: DevCollabSocket) => {
    const { userId, email } = socket.data.user;

    // Validate workspaceId from handshake
    const workspaceId = socket.handshake.auth?.workspaceId as string | undefined;
    if (!workspaceId) {
      console.warn(
        `Socket ${socket.id} (user: ${userId}) connected without workspaceId — disconnecting`
      );
      socket.emit("error", { message: "workspaceId is required in handshake.auth" });
      socket.disconnect(true);
      return;
    }

    console.log(`Socket connected: ${socket.id} — user: ${userId} (${email})`);

    // Store workspaceId and initialize task tracking set on socket.data
    socket.data.workspaceId = workspaceId;
    socket.data.activeTasks = new Set<string>();

    // Auto-join workspace and private user rooms
    socket.join(`workspace:${workspaceId}`);
    socket.join(`user:${userId}`);

    // Register presence event handlers (presence:ping)
    registerPresenceHandlers(io, socket as Parameters<typeof registerPresenceHandlers>[1]);

    // ── 5. Room join/leave events ─────────────────────────────────────────

    socket.on("join:project", (payload: { projectId: string }) => {
      try {
        const { projectId } = payload;
        if (!projectId) return;
        socket.join(`project:${projectId}`);
        socket.emit("joined:project", { projectId });
      } catch (err) {
        console.error(`[join:project] Error for socket ${socket.id}:`, err);
      }
    });

    socket.on("leave:project", (payload: { projectId: string }) => {
      try {
        const { projectId } = payload;
        if (!projectId) return;
        socket.leave(`project:${projectId}`);
      } catch (err) {
        console.error(`[leave:project] Error for socket ${socket.id}:`, err);
      }
    });

    socket.on("join:task", (payload: { taskId: string }) => {
      try {
        const { taskId } = payload;
        if (!taskId) return;

        socket.join(`task:${taskId}`);
        socket.data.activeTasks.add(`task:${taskId}`);
        socket.emit("joined:task", { taskId });

        // Notify other viewers in this task room that this user is now viewing
        io.to(`task:${taskId}`).emit("task:viewing", {
          taskId,
          user: {
            userId: socket.data.user.userId,
            name: socket.data.user.name ?? socket.data.user.email,
            avatar: socket.data.user.avatar ?? null,
          },
        });
      } catch (err) {
        console.error(`[join:task] Error for socket ${socket.id}:`, err);
      }
    });

    socket.on("leave:task", (payload: { taskId: string }) => {
      try {
        const { taskId } = payload;
        if (!taskId) return;

        socket.leave(`task:${taskId}`);
        socket.data.activeTasks.delete(`task:${taskId}`);

        // Notify remaining viewers that this user stopped viewing
        io.to(`task:${taskId}`).emit("task:stopped-viewing", {
          taskId,
          userId: socket.data.user.userId,
        });
      } catch (err) {
        console.error(`[leave:task] Error for socket ${socket.id}:`, err);
      }
    });

    // ── 6. Disconnect ─────────────────────────────────────────────────────

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id} — user: ${userId}`);
      handlePresenceDisconnect(
        io,
        socket as Parameters<typeof handlePresenceDisconnect>[1]
      ).catch((err) => {
        console.error(`[disconnect] Presence cleanup failed for socket ${socket.id}:`, err);
      });
    });
  });

  // Initialization complete
}

// ─── Typed emit helpers ──────────────────────────────────────────────────────

/**
 * Emit a Socket.IO event to all clients in a project room.
 * Used by task, comment, and other project-scoped modules.
 */
export function emitToProject(projectId: string, event: string, data: unknown): void {
  if (!io) {
    console.error("emitToProject called before initSocket");
    return;
  }
  io.to(`project:${projectId}`).emit(event, data);
}

/**
 * Emit a Socket.IO event to a specific user's private room.
 * Used for direct notifications (notification:new, etc.).
 */
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) {
    console.error("emitToUser called before initSocket");
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit a Socket.IO event to all clients in a workspace room.
 * Used for presence updates and workspace-wide broadcasts.
 */
export function emitToWorkspace(workspaceId: string, event: string, data: unknown): void {
  if (!io) {
    console.error("emitToWorkspace called before initSocket");
    return;
  }
  io.to(`workspace:${workspaceId}`).emit(event, data);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { io };
export default initSocket;
