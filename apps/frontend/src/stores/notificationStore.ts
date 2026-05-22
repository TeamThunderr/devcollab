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
      const notifications = response.data || (response as any).notifications || [];
      set({ 
        notifications, 
        meta: response.meta,
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
      set({ 
        notifications: [...notifications, ...newNotifications], 
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
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to fetch unread count', error);
    }
  },

  markAsRead: async (id: string) => {
    const { notifications, unreadCount } = get();
    const target = notifications.find(n => n.id === id);
    if (!target || target.readAt) return; // already read

    // Optimistic UI update
    set({
      notifications: notifications.map(n => 
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, unreadCount - 1)
    });

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

    // Optimistic update
    set({
      notifications: notifications.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
      unreadCount: 0
    });

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
