/**
 * apps/frontend/src/hooks/usePresence.ts
 *
 * Manages workspace presence for the connected user.
 *
 * On mount:
 *   - Sends an immediate presence:ping
 *   - Sets up a 30-second interval to keep the heartbeat alive
 *
 * Listens for "presence:update" from the server and pushes the active
 * user list into the realtime store.
 *
 * On unmount:
 *   - Clears the interval
 *   - Removes the event listener (no memory leak)
 */

import { useEffect } from "react";
import { socket } from "../lib/socket";
import useRealtimeStore, { OnlineUser } from "../stores/realtimeStore";

const PING_INTERVAL_MS = 30_000;

interface PresenceUpdatePayload {
  users: OnlineUser[];
}

export function usePresence(workspaceId: string, projectId?: string) {
  const setOnlineUsers = useRealtimeStore((s) => s.setOnlineUsers);
  const onlineUsers = useRealtimeStore((s) => s.onlineUsers);

  useEffect(() => {
    if (!workspaceId) return;

    // Emit immediately on mount so we appear online right away
    socket.emit("presence:ping", { workspaceId, projectId });

    // Keep the heartbeat alive every 30 seconds
    const intervalId = window.setInterval(() => {
      socket.emit("presence:ping", { workspaceId, projectId });
    }, PING_INTERVAL_MS);

    // Receive the authoritative list of online users from the server
    const handlePresenceUpdate = (payload: unknown) => {
      const data = payload as PresenceUpdatePayload;
      if (Array.isArray(data?.users)) {
        setOnlineUsers(data.users);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        socket.emit("presence:ping", { workspaceId, projectId });
      }
    };

    let idleTimer: ReturnType<typeof setTimeout>;
    const handleMouseMove = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        socket.emit("presence:ping", { workspaceId, projectId });
      }, 60000);
    };

    socket.on("presence:update", handlePresenceUpdate);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      clearInterval(intervalId);
      clearTimeout(idleTimer);
      socket.off("presence:update", handlePresenceUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [workspaceId, projectId, setOnlineUsers]);

  return { onlineUsers };
}
