/**
 * apps/frontend/src/components/notifications/NotificationBell.tsx
 *
 * Bell icon with unread count badge. Toggles NotificationPanel on click.
 */

import React, { useState } from "react";
import useRealtimeStore from "../../stores/realtimeStore";
import NotificationPanel from "./NotificationPanel";

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationBell(): React.ReactElement {
  const unreadCount = useRealtimeStore((s) => s.unreadCount);
  const [isOpen, setIsOpen] = useState(false);

  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="relative p-2 rounded-lg
                   text-gray-500 dark:text-gray-400
                   hover:text-gray-900 dark:hover:text-white
                   hover:bg-gray-100 dark:hover:bg-gray-800
                   transition-colors duration-150
                   focus:outline-none focus-visible:ring-2
                   focus-visible:ring-blue-500"
      >
        {/* Bell icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5
                       w-4 h-4 min-w-[1rem]
                       bg-red-500 text-white text-[10px] font-bold
                       rounded-full flex items-center justify-center
                       leading-none"
            aria-hidden="true"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
