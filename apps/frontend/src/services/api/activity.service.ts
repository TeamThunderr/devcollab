import { apiClient } from './client';
import { Activity, PaginatedResponse } from '../../types';

export interface ActivityFilters {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export const activityService = {
  async getActivities(workspaceId: string, filters?: ActivityFilters): Promise<PaginatedResponse<Activity>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
    }

    const queryString = params.toString();
    const url = `/activities/${workspaceId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<PaginatedResponse<Activity>>(url);
    return response.data;
  }
};
