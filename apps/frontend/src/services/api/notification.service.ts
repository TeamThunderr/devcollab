import { apiClient } from './client';
import { Notification, PaginatedResponse } from '../../types';

export const notificationService = {
  getNotifications: async (params?: { page?: number; limit?: number; isRead?: 'true' | 'false'; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.isRead) query.append('isRead', params.isRead);
    if (params?.type) query.append('type', params.type);

    const queryString = query.toString();
    const url = `/notifications${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<PaginatedResponse<Notification>>(url);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get<{ unread: number }>('/notifications/unread-count');
    return response.data.unread;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.patch<Notification>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.patch<{ count: number }>('/notifications/read-all');
    return response.data.count;
  }
};
