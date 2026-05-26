import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useActivityStore } from '../../stores/activityStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import ActivityTimeline from '../../components/activity/ActivityTimeline';
import ActivityFiltersComponent from '../../components/activity/ActivityFilters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

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
        fetchWorkspaceDetails(workspaceId).catch(() => {});
      }
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
      <div className="p-8 text-center">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => workspaceId && fetchActivities(workspaceId, true)}
          className="mt-4 px-4 py-2 bg-red-950/30 text-red-400 border border-red-800 rounded-lg hover:bg-red-950/50 text-sm transition-colors"
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
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-500" />
          Activity Feed
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Stay up to date with everything happening in{' '}
          <span className="text-gray-300 font-medium">
            {activeWorkspace?.name || 'this workspace'}
          </span>.
        </p>
      </div>

      <ActivityFiltersComponent
        filters={filters}
        onFilterChange={setFilters}
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center bg-[#17191d] border border-white/[0.04] rounded-xl">
          <LoadingSpinner size="lg" />
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-[#17191d] border border-white/[0.04] rounded-xl">
          <EmptyState
            icon={Activity}
            title="No activity yet"
            subtitle="Actions like task updates, comments, and wiki edits will appear here"
          />
        </div>
      ) : (
        <div className="bg-[#17191d] border border-white/[0.04] rounded-xl p-6 md:p-8 shadow-sm">
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
