import { create } from 'zustand';
import { Activity, PaginatedResponse } from '../types';
import { activityService, ActivityFilters } from '../services/api/activity.service';

interface ActivityStore {
  activities: Activity[];
  meta: PaginatedResponse<Activity>['meta'] | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  filters: ActivityFilters;
  hasMore: boolean;

  setFilters: (filters: Partial<ActivityFilters>) => void;
  fetchActivities: (workspaceId: string, reset?: boolean) => Promise<void>;
  loadMore: (workspaceId: string) => Promise<void>;
  appendActivity: (activity: Activity) => void;
  resetStore: () => void;
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  activities: [],
  meta: null,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  filters: {
    page: 1,
    limit: 20
  },
  hasMore: false,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters, page: 1 } // Reset to page 1 on filter change
    }));
  },

  fetchActivities: async (workspaceId: string, reset = false) => {
    const { filters } = get();
    
    if (reset) {
      set({ isLoading: true, error: null, activities: [], meta: null });
    } else {
      set({ isLoading: true, error: null });
    }

    try {
      const response = await activityService.getActivities(workspaceId, { ...filters, page: 1 });
      set({ 
        activities: response.data || (response as any).activities || [], 
        meta: response.meta,
        isLoading: false,
        hasMore: response.meta.page < response.meta.totalPages
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to fetch activities', 
        isLoading: false 
      });
    }
  },

  loadMore: async (workspaceId: string) => {
    const { filters, meta, hasMore, isLoadingMore, activities } = get();
    
    if (!hasMore || isLoadingMore || !meta) return;

    set({ isLoadingMore: true, error: null });
    
    const nextPage = meta.page + 1;
    
    try {
      const response = await activityService.getActivities(workspaceId, { ...filters, page: nextPage });
      set({ 
        activities: [...activities, ...(response.data || (response as any).activities || [])], 
        meta: response.meta,
        filters: { ...filters, page: nextPage },
        isLoadingMore: false,
        hasMore: response.meta.page < response.meta.totalPages
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to fetch more activities', 
        isLoadingMore: false 
      });
    }
  },

  appendActivity: (activity: Activity) => {
    set((state) => {
      // Avoid duplicates
      if (state.activities.some((a) => a.id === activity.id)) return state;
      return {
        activities: [activity, ...state.activities]
      };
    });
  },

  resetStore: () => {
    set({
      activities: [],
      meta: null,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      filters: { page: 1, limit: 20 },
      hasMore: false
    });
  }
}));
