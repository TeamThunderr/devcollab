import api from '../../lib/axios';
import { Notification, PaginatedResponse } from '../../types';

export const notificationService = {
  createNotification: async (payload: { userId: string; type: string; message: string; metadata?: any }) => {
    const response = await api.post<Notification>('/api/notifications', payload);
    return response.data;
  },

  getNotifications: async (params?: { page?: number; limit?: number; isRead?: 'true' | 'false'; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.isRead) query.append('isRead', params.isRead);
    if (params?.type) query.append('type', params.type);

    const queryString = query.toString();
    const url = `/api/notifications${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get<PaginatedResponse<Notification>>(url);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get<{ unread: number }>('/api/notifications/unread-count');
    return response.data.unread;
  },

  markAsRead: async (id: string) => {
    const response = await api.patch<Notification>(`/api/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch<{ count: number }>('/api/notifications/read-all');
    return response.data.count;
  }
};
