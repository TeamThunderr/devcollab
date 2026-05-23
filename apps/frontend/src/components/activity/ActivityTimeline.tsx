import { Activity } from '../../types';

interface ActivityTimelineProps {
  activities: Activity[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

const ACTION_MESSAGES: Record<string, string> = {
  WORKSPACE_CREATED: 'created the workspace',
  MEMBER_INVITED: 'invited',
  INVITE_ACCEPTED: 'joined the workspace',
  ROLE_UPDATED: 'updated the role of',
  MEMBER_REMOVED: 'removed',
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

function getActivityMessage(activity: Activity) {
  const actor = activity.user?.name || activity.user?.email || 'Someone';
  const actionText = ACTION_MESSAGES[activity.action] || activity.action.toLowerCase().replace('_', ' ');
  
  // Custom parsing based on metadata if available
  if (activity.metadata) {
    if (activity.action === 'MEMBER_INVITED' && activity.metadata.email) {
      return `${actor} invited ${activity.metadata.email} as ${activity.metadata.role}`;
    }
    if (activity.action === 'ROLE_UPDATED' && activity.metadata.newRole) {
      return `${actor} updated a member's role to ${activity.metadata.newRole}`;
    }
    if (activity.action === 'MEMBER_REMOVED' && activity.metadata.removedUserId) {
      return `${actor} removed a member`;
    }
  }

  if (activity.action === 'WORKSPACE_CREATED') {
    return `${actor} created the workspace`;
  }
  if (activity.action === 'INVITE_ACCEPTED') {
    return `${actor} joined the workspace`;
  }

  let entityDesc = activity.entityType ? activity.entityType.toLowerCase().replace('_', ' ') : '';
  return `${actor} ${actionText} ${entityDesc}`;
}

function getActionIcon(action: string) {
  switch (action) {
    case 'WORKSPACE_CREATED': return '✨';
    case 'MEMBER_INVITED': return '📩';
    case 'INVITE_ACCEPTED': return '👋';
    case 'ROLE_UPDATED': return '🛡️';
    case 'MEMBER_REMOVED': return '🗑️';
    default: return '⚡';
  }
}

export default function ActivityTimeline({ activities, hasMore, isLoadingMore, onLoadMore }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        <span className="text-4xl">📭</span>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No activity yet</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Activities in this workspace will appear here.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800"></div>

      <div className="space-y-6">
        {activities.map((activity) => (
          <div key={activity.id} className="relative flex items-start gap-6">
            <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-gray-950 border-[4px] border-white dark:border-gray-950">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 shadow-sm text-xl">
                {getActionIcon(activity.action)}
              </div>
            </div>
            
            <div className="flex-1 pt-2 pb-6 border-b border-gray-100 dark:border-gray-800/50 last:border-0">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {getActivityMessage(activity)}
                </p>
                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatTimeAgo(activity.createdAt)}
                </span>
              </div>
              
              {/* Optional detailed view if metadata has more info (like previous state vs new state) */}
              {activity.metadata?.changes && (
                <div className="mt-3 text-xs p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-mono">
                  {JSON.stringify(activity.metadata.changes, null, 2)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-full transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading older activity...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
