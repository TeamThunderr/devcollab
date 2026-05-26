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
  workspaceId?: string;
  projectId?: string;
  maxShow?: number;
  showCount?: boolean;
  size?: 'sm' | 'md';
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
  maxShow = 4,
  showCount = false,
  size = 'md',
}: OnlineAvatarsProps): React.ReactElement | null {
  const currentUser = useAuthStore((s) => s.user);
  const { onlineUsers } = usePresence(workspaceId || '', projectId);

  const others = onlineUsers.filter(
    (u: OnlineUser) => u.userId !== currentUser?.id
  );

  if (others.length === 0) return null;

  const visible = others.slice(0, maxShow);
  const overflow = others.length - maxShow;

  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-row items-center" aria-label="Online users">
        {visible.map((user: OnlineUser, index: number) => (
          <div
            key={user.userId}
            className={`relative flex-shrink-0 ${index > 0 ? "-ml-2" : ""}`}
            style={{ zIndex: index + 1 }}
            title={`${user.name} — online`}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className={`${sizeClass} rounded-full object-cover ring-1 ring-gray-950`}
              />
            ) : (
              <div
                className={`${sizeClass} rounded-full ring-1 ring-gray-950
                           flex items-center justify-center
                           text-white font-semibold select-none`}
                style={{ backgroundColor: getColor(index) }}
                aria-label={user.name}
              >
                {getInitial(user.name)}
              </div>
            )}

            <span
              className="absolute bottom-0 right-0 w-2 h-2
                         bg-green-400 rounded-full ring-1 ring-gray-950"
              aria-hidden="true"
            />
          </div>
        ))}

        {overflow > 0 && (
          <div
            className={`-ml-2 ${sizeClass} rounded-full
                       bg-gray-700 ring-1 ring-gray-950
                       flex items-center justify-center
                       font-medium text-gray-300
                       select-none relative`}
            style={{ zIndex: visible.length + 1 }}
            title={`${overflow} more online`}
          >
            +{overflow}
          </div>
        )}
      </div>
      
      {showCount && (
        <span className="text-xs text-gray-500">
          {others.length} online
        </span>
      )}
    </div>
  );
}
