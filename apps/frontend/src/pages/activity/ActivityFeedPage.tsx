import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useActivityStore } from '../../stores/activityStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import ActivityTimeline from '../../components/activity/ActivityTimeline';
import ActivityFiltersComponent from '../../components/activity/ActivityFilters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ActivityFeedPage(): React.ReactElement {
  const { workspaceId } = useParams();
  const { activeWorkspace, fetchWorkspaceDetails } = useWorkspaceStore();
  
  const {
    activities,
    isLoading,
    isLoadingMore,
    error,
    filters,
    hasMore,
    fetchActivities,
    loadMore,
    setFilters,
    resetStore
  } = useActivityStore();

  useEffect(() => {
    if (workspaceId) {
      if (!activeWorkspace || activeWorkspace.id !== workspaceId) {
        fetchWorkspaceDetails(workspaceId).catch(console.error);
      }
      
      // Fetch activities when workspace or filters change
      fetchActivities(workspaceId, true);
    }
  }, [workspaceId, filters.userId, filters.action]);

  useEffect(() => {
    return () => {
      resetStore();
    };
  }, []);

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error loading activity feed: {error}</p>
        <button 
          onClick={() => workspaceId && fetchActivities(workspaceId, true)}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          Activity Feed
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Stay up to date with everything happening in {activeWorkspace?.name || 'this workspace'}.
        </p>
      </div>

      <ActivityFiltersComponent 
        filters={filters} 
        onFilterChange={setFilters} 
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 md:p-8 shadow-sm">
          <ActivityTimeline 
            activities={activities}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={() => workspaceId && loadMore(workspaceId)}
          />
        </div>
      )}
    </div>
  );
}
