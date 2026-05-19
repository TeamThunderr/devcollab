/**
 * apps/frontend/src/components/presence/OnlineAvatars.tsx
 *
 * Stacked avatar row showing who is currently online in the workspace.
 * Filters out the current user, caps at 4 visible, shows "+N" overflow chip.
 */

import React from "react";
import { usePresence } from "../../hooks/usePresence";
import useAuthStore from "../../stores/authStore";
import type { OnlineUser } from "../../stores/realtimeStore";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnlineAvatarsProps {
  workspaceId: string;
  projectId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#3266ad",
  "#1D9E75",
  "#BA7517",
  "#D85A30",
  "#534AB7",
  "#D4537E",
] as const;

const MAX_VISIBLE = 4;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function getColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnlineAvatars({
  workspaceId,
  projectId,
}: OnlineAvatarsProps): React.ReactElement | null {
  const currentUser = useAuthStore((s) => s.user);
  const { onlineUsers } = usePresence(workspaceId, projectId);

  // Exclude the signed-in user from the list
  const others = onlineUsers.filter(
    (u: OnlineUser) => u.userId !== currentUser?.userId
  );

  if (others.length === 0) return null;

  const visible = others.slice(0, MAX_VISIBLE);
  const overflow = others.length - MAX_VISIBLE;

  return (
    <div className="flex flex-row items-center" aria-label="Online users">
      {visible.map((user: OnlineUser, index: number) => (
        <div
          key={user.userId}
          className={`relative flex-shrink-0 ${index > 0 ? "-ml-2" : ""}`}
          title={user.name}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-gray-900"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-gray-900
                         flex items-center justify-center
                         text-white text-xs font-semibold select-none"
              style={{ backgroundColor: getColor(index) }}
              aria-label={user.name}
            >
              {getInitial(user.name)}
            </div>
          )}

          {/* Online indicator dot */}
          <span
            className="absolute bottom-0 right-0 w-2 h-2
                       bg-green-400 rounded-full ring-1 ring-white"
            aria-hidden="true"
          />
        </div>
      ))}

      {/* Overflow chip */}
      {overflow > 0 && (
        <div
          className="-ml-2 w-8 h-8 rounded-full
                     bg-gray-100 dark:bg-gray-700
                     ring-2 ring-white dark:ring-gray-900
                     flex items-center justify-center
                     text-xs font-medium text-gray-600 dark:text-gray-300
                     select-none"
          title={`${overflow} more online`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
