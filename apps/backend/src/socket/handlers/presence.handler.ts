/**
 * apps/backend/src/socket/handlers/presence.handler.ts
 *
 * Presence system backed by Redis.
 *
 * Redis keys:
 *   "presence:{workspaceId}"            Hash  — all online users in workspace
 *   "presence:{workspaceId}:{userId}"   SETEX — heartbeat TTL marker (35s)
 *
 * Flow:
 *   1. Client calls presence:ping every 30s with { workspaceId, projectId? }
 *   2. Server writes / refreshes the user's entry in the workspace hash
 *   3. Server filters out stale entries (those whose SETEX key has expired)
 *   4. Server broadcasts presence:update to workspace:{workspaceId}
 *
 * On disconnect:
 *   - User entry removed from Redis hash immediately
 *   - presence:update broadcast with remaining users
 *   - task:stopped-viewing broadcast for all tasks the user was viewing
 */

import { Server, Socket } from "socket.io";
import { redis } from "../../redis/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceEntry {
  userId: string;
  name: string;
  avatar: string | null;
  projectId: string | null;
  lastSeen: string; // ISO 8601
}

// The shape of socket.data as extended in socket.ts
interface SocketData {
  user: {
    userId: string;
    email: string;
    name?: string;
    avatar?: string;
  };
  workspaceId?: string;
  /** Set of task room names (e.g. "task:abc123") the socket has joined */
  activeTasks?: Set<string>;
}

// Narrow Socket type to what we need — avoids importing the full generic chain
type DevCollabSocket = Socket & { data: SocketData };
type DevCollabServer = Server;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Redis key for the workspace presence hash */
const hashKey = (workspaceId: string) => `presence:${workspaceId}`;

/** Redis key for a user's per-socket heartbeat TTL marker */
const ttlKey = (workspaceId: string, userId: string) =>
  `presence:${workspaceId}:${userId}`;

/**
 * Read all active (non-expired) presence entries for a workspace.
 * Stale entries whose SETEX key has expired are pruned from the hash.
 */
async function getActivePresence(workspaceId: string): Promise<PresenceEntry[]> {
  if (!redis) return []; // Redis unavailable — degraded mode

  const hash = await redis.hgetall(hashKey(workspaceId));
  if (!hash) return [];

  const activeUsers: PresenceEntry[] = [];
  const expiredUserIds: string[] = [];

  await Promise.all(
    Object.entries(hash).map(async ([userId, raw]) => {
      try {
        const isAlive = await redis!.exists(ttlKey(workspaceId, userId));
        if (isAlive) {
          const entry = JSON.parse(raw) as PresenceEntry;
          activeUsers.push(entry);
        } else {
          expiredUserIds.push(userId);
        }
      } catch (parseErr) {
        console.error(`[presence] Failed to parse entry for user ${userId}:`, parseErr);
        expiredUserIds.push(userId);
      }
    })
  );

  // Clean up stale entries from the hash so it doesn't grow unbounded
  if (expiredUserIds.length > 0) {
    await redis!.hdel(hashKey(workspaceId), ...expiredUserIds).catch((err) => {
      console.error("[presence] Failed to prune stale entries:", err);
    });
  }

  return activeUsers;
}

/**
 * Broadcast the current active presence list to the workspace room.
 */
async function broadcastPresence(
  io: DevCollabServer,
  workspaceId: string
): Promise<void> {
  const users = await getActivePresence(workspaceId);
  io.to(`workspace:${workspaceId}`).emit("presence:update", { users });
}

// ─── registerPresenceHandlers ─────────────────────────────────────────────────

/**
 * Register all presence-related socket event listeners for one connection.
 * Call this from socket.ts on every "connection" event.
 */
export function registerPresenceHandlers(
  io: DevCollabServer,
  socket: DevCollabSocket
): void {
  const workspaceId = socket.data.workspaceId;

  // Initialize per-socket task tracking set
  socket.data.activeTasks = new Set<string>();

  // ── presence:ping ──────────────────────────────────────────────────────────
  // Client fires this every 30 seconds to refresh their presence entry.

  socket.on(
    "presence:ping",
    async (payload: { workspaceId: string; projectId?: string }) => {
      try {
        if (!redis) return; // Redis unavailable — skip presence update

        const pingWorkspaceId = payload?.workspaceId ?? workspaceId;
        if (!pingWorkspaceId) return;

        const { userId, name, avatar } = socket.data.user as {
          userId: string;
          name?: string;
          avatar?: string;
          email: string;
        };

        const entry: PresenceEntry = {
          userId,
          name: name ?? socket.data.user.email, // fallback to email if name not set
          avatar: avatar ?? null,
          projectId: payload?.projectId ?? null,
          lastSeen: new Date().toISOString(),
        };

        // Write entry to workspace hash
        await redis.hset(hashKey(pingWorkspaceId), userId, JSON.stringify(entry));

        // Workspace hash lives 2 minutes (safety net — individual TTL is 35s)
        await redis.expire(hashKey(pingWorkspaceId), 120);

        // Per-user TTL marker — if this expires the user is considered offline
        await redis.setex(ttlKey(pingWorkspaceId, userId), 35, "1");

        // Broadcast updated presence list to everyone in the workspace
        await broadcastPresence(io, pingWorkspaceId);
      } catch (err) {
        console.error(`[presence:ping] Error for socket ${socket.id}:`, err);
      }
    }
  );
}

// ─── handlePresenceDisconnect ─────────────────────────────────────────────────

/**
 * Clean up presence data when a socket disconnects.
 * Call this from socket.ts inside the "disconnect" event handler.
 */
export async function handlePresenceDisconnect(
  io: DevCollabServer,
  socket: DevCollabSocket
): Promise<void> {
  const workspaceId = socket.data.workspaceId;
  const userId = socket.data.user?.userId;

  if (!workspaceId || !userId) return;

  if (redis) {
    try {
      // Remove user from the workspace presence hash
      await redis.hdel(hashKey(workspaceId), userId);

      // Delete the heartbeat TTL marker
      await redis.del(ttlKey(workspaceId, userId));

      // Broadcast updated (user-removed) presence list
      await broadcastPresence(io, workspaceId);
    } catch (err) {
      console.error(`[presence disconnect] Redis cleanup failed for user ${userId}:`, err);
    }
  }

  // Notify all task rooms this user was viewing that they stopped viewing
  const activeTasks = socket.data.activeTasks;
  if (activeTasks && activeTasks.size > 0) {
    for (const taskRoom of activeTasks) {
      // taskRoom format: "task:{taskId}"
      const taskId = taskRoom.replace(/^task:/, "");
      try {
        io.to(taskRoom).emit("task:stopped-viewing", { taskId, userId });
      } catch (err) {
        console.error(`[presence disconnect] Failed to emit task:stopped-viewing for ${taskRoom}:`, err);
      }
    }
  }
}

export default registerPresenceHandlers;
