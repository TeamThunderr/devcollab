/**
 * apps/frontend/src/components/notifications/NotificationPanel.tsx
 *
 * Dropdown panel showing recent notifications.
 * Closes when clicking outside or when the consumer calls onClose().
 */

import React, { useEffect, useRef } from "react";
import useRealtimeStore, { Notification } from "../../stores/realtimeStore";
import { socket } from "../../lib/socket";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<Notification["type"], string> = {
  mention: "#3266ad",
  assignment: "#1D9E75",
  task_moved: "#BA7517",
  comment: "#534AB7",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Relative time string — "just now", "2m ago", "3h ago", "5d ago" */
function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function getInitial(title: string): string {
  return (title.trim()[0] ?? "N").toUpperCase();
}

// ─── Notification Item ────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
  isLast: boolean;
  onItemClick: (notification: Notification) => void;
}

function NotificationItem({
  notification,
  isLast,
  onItemClick,
}: NotificationItemProps): React.ReactElement {
  const bgColor = TYPE_COLORS[notification.type];

  return (
    <button
      type="button"
      onClick={() => onItemClick(notification)}
      className={`w-full text-left flex gap-3 px-4 py-3
                  transition-colors duration-100
                  hover:bg-gray-50 dark:hover:bg-gray-800/60
                  ${!isLast ? "border-b border-gray-100 dark:border-gray-800" : ""}
                  ${!notification.read ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
    >
      {/* Colored initial avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full
                   flex items-center justify-center
                   text-white text-xs font-semibold"
        style={{ backgroundColor: bgColor }}
        aria-hidden="true"
      >
        {getInitial(notification.title)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {relativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.read && (
        <div
          className="flex-shrink-0 self-center w-2 h-2 rounded-full bg-blue-500"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export default function NotificationPanel({
  isOpen,
  onClose,
}: NotificationPanelProps): React.ReactElement | null {
  const notifications = useRealtimeStore((s) => s.notifications);
  const unreadCount = useRealtimeStore((s) => s.unreadCount);
  const markRead = useRealtimeStore((s) => s.markRead);
  const markAllRead = useRealtimeStore((s) => s.markAllRead);

  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the panel
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(e: MouseEvent): void {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }

    // Use capture phase so it fires before any other click handlers
    document.addEventListener("mousedown", handleOutsideClick, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleItemClick(notification: Notification): void {
    markRead(notification.id);
    if (notification.relatedTaskId) {
      socket.emit("join:task", { taskId: notification.relatedTaskId });
    }
    onClose();
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-full mt-2
                 w-80 max-h-96 overflow-y-auto
                 bg-white dark:bg-gray-900
                 border border-gray-200 dark:border-gray-700
                 shadow-lg rounded-xl z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3
                      border-b border-gray-100 dark:border-gray-800
                      sticky top-0 bg-white dark:bg-gray-900 z-10">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
          Notifications
        </h2>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-blue-600 dark:text-blue-400
                       hover:underline transition-colors duration-100
                       focus:outline-none focus-visible:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <span className="text-3xl" aria-hidden="true">
            🔔
          </span>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You&apos;re all caught up!
          </p>
        </div>
      ) : (
        <div>
          {notifications.map((notification, idx) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isLast={idx === notifications.length - 1}
              onItemClick={handleItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
