import { create } from 'zustand';
import { Notification, PaginatedResponse } from '../types';
import { notificationService } from '../services/api/notification.service';

interface NotificationStore {
  notifications: Notification[];
  meta: PaginatedResponse<Notification>['meta'] | null;
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  filters: { page: number; limit: number };

  fetchNotifications: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  appendNotification: (notification: Notification) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  meta: null,
  unreadCount: 0,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: false,
  filters: { page: 1, limit: 20 },

  fetchNotifications: async (reset = false) => {
    const { filters } = get();
    if (reset) {
      set({ isLoading: true, error: null, notifications: [], meta: null, filters: { ...filters, page: 1 } });
    } else {
      set({ isLoading: true, error: null });
    }

    try {
      const response = await notificationService.getNotifications({ page: 1, limit: filters.limit });
      const serverNotifications = response.data || (response as any).notifications || [];

      // Parse local storage notifications
      const localNotifications: Notification[] = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('devcollab_project_workspace_')) {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              const notifs = parsed.notifications || [];
              notifs.forEach((n: any) => {
                localNotifications.push({
                  id: n.id || `notif-local-${Date.now()}-${Math.random()}`,
                  userId: 'local',
                  type: 'MENTION',
                  message: n.message,
                  readAt: n.read ? n.timestamp : null,
                  createdAt: n.timestamp || new Date().toISOString(),
                });
              });
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse local notifications", e);
      }

      // Merge and sort
      const merged = [...serverNotifications, ...localNotifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const totalUnreadCount = merged.filter(n => !n.readAt).length;

      set({ 
        notifications: merged, 
        meta: response.meta,
        unreadCount: totalUnreadCount,
        isLoading: false,
        hasMore: response.meta.page < response.meta.totalPages
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to fetch notifications', 
        isLoading: false 
      });
    }
  },

  loadMore: async () => {
    const { filters, meta, hasMore, isLoadingMore, notifications } = get();
    if (!hasMore || isLoadingMore || !meta) return;

    set({ isLoadingMore: true, error: null });
    const nextPage = meta.page + 1;
    
    try {
      const response = await notificationService.getNotifications({ page: nextPage, limit: filters.limit });
      const newNotifications = response.data || (response as any).notifications || [];
      const updatedList = [...notifications, ...newNotifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      set({ 
        notifications: updatedList, 
        meta: response.meta,
        filters: { ...filters, page: nextPage },
        isLoadingMore: false,
        hasMore: response.meta.page < response.meta.totalPages
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to load more notifications', 
        isLoadingMore: false 
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await notificationService.getUnreadCount();
      // Calculate local unread count
      let localCount = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('devcollab_project_workspace_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            const notifs = parsed.notifications || [];
            localCount += notifs.filter((n: any) => !n.read).length;
          }
        }
      }
      set({ unreadCount: count + localCount });
    } catch (error) {
      console.error('Failed to fetch unread count', error);
    }
  },

  markAsRead: async (id: string) => {
    const { notifications, unreadCount } = get();
    const target = notifications.find(n => n.id === id);
    if (!target || target.readAt) return; // already read

    const nowIso = new Date().toISOString();
    // Optimistic UI update
    set({
      notifications: notifications.map(n => 
        n.id === id ? { ...n, readAt: nowIso } : n
      ),
      unreadCount: Math.max(0, unreadCount - 1)
    });

    // Handle local notification read
    if (id.startsWith('notif-')) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('devcollab_project_workspace_')) {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              let changed = false;
              if (parsed.notifications) {
                parsed.notifications = parsed.notifications.map((n: any) => {
                  if (n.id === id) {
                    changed = true;
                    return { ...n, read: true };
                  }
                  return n;
                });
              }
              if (changed) {
                localStorage.setItem(key, JSON.stringify(parsed));
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to mark local notification as read", e);
      }
      return;
    }

    try {
      await notificationService.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
      // Rollback on failure
      set({
        notifications: notifications.map(n => 
          n.id === id ? { ...n, readAt: null } : n
        ),
        unreadCount
      });
    }
  },

  markAllAsRead: async () => {
    const { notifications, unreadCount } = get();
    if (unreadCount === 0) return;

    const nowIso = new Date().toISOString();
    // Optimistic update
    set({
      notifications: notifications.map(n => ({ ...n, readAt: n.readAt || nowIso })),
      unreadCount: 0
    });

    // Mark all local notifications as read
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('devcollab_project_workspace_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.notifications) {
              parsed.notifications = parsed.notifications.map((n: any) => ({ ...n, read: true }));
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to mark all local notifications as read", e);
    }

    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read', error);
      // Re-fetch to sync if failed
      get().fetchNotifications(true);
      get().fetchUnreadCount();
    }
  },

  appendNotification: (notification: Notification) => {
    set((state) => {
      if (state.notifications.some(n => n.id === notification.id)) return state;
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
    });
  }
}));
