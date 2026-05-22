/**
 * apps/frontend/src/components/notifications/NotificationPanel.tsx
 *
 * Dropdown panel showing recent notifications.
 */

import React, { useEffect, useRef } from "react";
import { useNotificationStore } from "../../stores/notificationStore";
import { Notification } from "../../types";

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  WORKSPACE_INVITE: "#3266ad",
  ROLE_UPDATED: "#BA7517",
  MEMBER_REMOVED: "#E53E3E",
  MENTION: "#1D9E75",
  ASSIGNMENT: "#534AB7",
  DEFAULT: "#718096"
};

function relativeTime(isoString: string): string {
  if (!isoString) return '';
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
  if (!title) return 'N';
  return (title.trim()[0] ?? "N").toUpperCase();
}

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
  const bgColor = TYPE_COLORS[notification.type] || TYPE_COLORS.DEFAULT;
  const isUnread = !notification.readAt;

  return (
    <button
      type="button"
      onClick={() => onItemClick(notification)}
      className={`w-full text-left flex items-start gap-4 px-4 py-4
                  transition-colors duration-100
                  hover:bg-gray-50 dark:hover:bg-gray-800/60
                  ${!isLast ? "border-b border-gray-100 dark:border-gray-800" : ""}
                  ${isUnread ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full
                   flex items-center justify-center
                   text-white text-xs font-semibold"
        style={{ backgroundColor: bgColor }}
        aria-hidden="true"
      >
        {getInitial(notification.type.replace('_', ' '))}
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <p className={`text-sm leading-snug break-words ${isUnread ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
          {relativeTime(notification.createdAt)}
        </p>
      </div>

      {isUnread && (
        <div
          className="flex-shrink-0 self-center w-2 h-2 rounded-full bg-blue-500"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

export default function NotificationPanel({
  isOpen,
  onClose,
}: NotificationPanelProps): React.ReactElement {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    fetchNotifications,
    isLoading,
    hasMore,
    loadMore
  } = useNotificationStore();

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(e: MouseEvent): void {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick, true);
    return () => document.removeEventListener("mousedown", handleOutsideClick, true);
  }, [isOpen, onClose]);

  function handleItemClick(notification: Notification): void {
    if (!notification.readAt) {
      markAsRead(notification.id);
    }
    // TODO: Navigate based on metadata.workspaceId or metadata.taskId if applicable
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      className={`absolute right-0 top-full mt-2 w-[400px] max-h-[32rem] overflow-y-auto
                  bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                  shadow-xl rounded-xl z-50 transform transition-all duration-200 origin-top-right
                  ${isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur z-10">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
          Notifications
        </h2>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead()}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-100 focus:outline-none focus-visible:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading && notifications.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <span className="text-3xl" aria-hidden="true">🔔</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You&apos;re all caught up!
          </p>
        </div>
      ) : (
        <div className="pb-2">
          {notifications.map((notification, idx) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isLast={idx === notifications.length - 1}
              onItemClick={handleItemClick}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => loadMore()}
              className="w-full text-center py-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Load older notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
}
