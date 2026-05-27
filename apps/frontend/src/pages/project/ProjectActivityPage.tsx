/**
 * apps/frontend/src/pages/project/ProjectActivityPage.tsx
 *
 * Project-level activity feed — shows TASK_MOVED, COMMENT_ADDED,
 * DOC_UPDATED and MEMBER_JOINED events scoped to the current project.
 * Real-time updates arrive via the `activity:new` Socket.IO event.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowRightLeft,
  MessageSquare,
  FileText,
  UserPlus,
  Activity,
  Zap,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { activityService } from '../../services/api/activity.service';
import { useProjectActivity } from '../../hooks/useProjectActivity';
import { Activity as ActivityType } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 5) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

function getActivityContent(activity: ActivityType): { icon: React.ReactNode; color: string; label: string; detail?: string } {
  const actor = activity.user?.name || activity.user?.email || 'Someone';
  const meta = activity.metadata || {};

  switch (activity.action) {
    case 'TASK_MOVED':
      return {
        icon: <ArrowRightLeft className="w-4 h-4" />,
        color: 'from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400',
        label: `${actor} moved task`,
        detail: meta.taskTitle
          ? `"${meta.taskTitle}" → ${STATUS_LABELS[meta.toStatus] || meta.toStatus}`
          : meta.toStatus,
      };

    case 'COMMENT_ADDED':
      return {
        icon: <MessageSquare className="w-4 h-4" />,
        color: 'from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400',
        label: `${actor} commented on`,
        detail: meta.taskTitle
          ? `"${meta.taskTitle}"${meta.commentPreview ? `: "${meta.commentPreview}${meta.commentPreview.length >= 80 ? '…' : ''}"` : ''}`
          : undefined,
      };

    case 'DOC_UPDATED':
      return {
        icon: <FileText className="w-4 h-4" />,
        color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
        label: `${actor} ${meta.operation === 'created' ? 'created doc' : 'updated doc'}`,
        detail: meta.pageTitle ? `"${meta.pageTitle}"` : undefined,
      };

    case 'MEMBER_JOINED':
      return {
        icon: <UserPlus className="w-4 h-4" />,
        color: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
        label: `${actor} added`,
        detail: meta.targetName
          ? `${meta.targetName} to the project as ${meta.role}`
          : 'a new member',
      };

    default: {
      // Workspace-level actions that may appear
      const actionText = activity.action.toLowerCase().replace(/_/g, ' ');
      return {
        icon: <Zap className="w-4 h-4" />,
        color: 'from-gray-500/20 to-gray-500/5 border-gray-500/30 text-gray-400',
        label: `${actor} ${actionText}`,
      };
    }
  }
}

function getAvatarInitials(user?: { name?: string; email?: string }): string {
  if (!user) return '?';
  const src = user.name || user.email || '';
  return src.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Activity Item ────────────────────────────────────────────────────────────

interface ActivityItemProps {
  activity: ActivityType;
  isNew?: boolean;
}

function ActivityItem({ activity, isNew }: ActivityItemProps) {
  const { icon, color, label, detail } = getActivityContent(activity);
  const initials = getAvatarInitials(activity.user);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNew && itemRef.current) {
      itemRef.current.animate(
        [
          { opacity: 0, transform: 'translateY(-12px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 350, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards' }
      );
    }
  }, [isNew]);

  return (
    <div
      ref={itemRef}
      className="group relative flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors duration-150"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30
                     border border-white/10 flex items-center justify-center
                     text-xs font-semibold text-white/80 select-none"
        >
          {activity.user?.avatar ? (
            <img src={activity.user.avatar} className="w-full h-full rounded-full object-cover" alt="" />
          ) : initials}
        </div>
        {/* Action icon badge */}
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br ${color}
                         border border-white/10 flex items-center justify-center`}>
          {icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm text-white/90 leading-snug">
          <span className="font-medium">{label}</span>
          {detail && (
            <span className="text-white/50 ml-1">{detail}</span>
          )}
        </p>
        <span className="text-xs text-white/30 mt-0.5 block">
          {formatTimeAgo(activity.createdAt)}
        </span>
      </div>

      {/* Realtime pulse for new items */}
      {isNew && (
        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-400 mt-2 animate-pulse" />
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyActivityState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10
                      border border-indigo-500/20 flex items-center justify-center mb-5">
        <Activity className="w-7 h-7 text-indigo-400/70" />
      </div>
      <h3 className="text-base font-semibold text-white/80 mb-1">No activity yet</h3>
      <p className="text-sm text-white/40 max-w-xs">
        Move a task, add a comment, update a doc, or add a member — it'll show up here in real-time.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectActivityPage(): React.ReactElement {
  const { projectId } = useParams<{ projectId: string }>();

  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(0);

  // ── Initial fetch ───────────────────────────────────────────────────────────

  const fetchActivities = useCallback(async (reset = false) => {
    if (!projectId) return;

    const targetPage = reset ? 1 : page;
    if (reset) {
      setIsLoading(true);
      setActivities([]);
      setPage(1);
      setHasMore(false);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const response = await activityService.getProjectActivities(projectId, {
        page: targetPage,
        limit: 25,
      });
      const incoming = response.data || [];

      setActivities(prev => reset ? incoming : [...prev, ...incoming]);
      setHasMore(response.meta.page < response.meta.totalPages);
      setPage(response.meta.page + 1);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load activity');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [projectId, page]);

  useEffect(() => {
    fetchActivities(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Real-time updates ───────────────────────────────────────────────────────

  useProjectActivity({
    onActivity: (activity) => {
      setActivities(prev => {
        if (prev.some(a => a.id === activity.id)) return prev;
        return [activity, ...prev];
      });
      setNewIds(prev => new Set(prev).add(activity.id));
      setLiveCount(c => c + 1);

      // Clear "new" highlight after 4 s
      setTimeout(() => {
        setNewIds(prev => {
          const next = new Set(prev);
          next.delete(activity.id);
          return next;
        });
      }, 4000);
    },
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-[#0f1117]">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-white/[0.06] bg-[#0f1117]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/20
                            border border-indigo-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">Activity</h1>
              <p className="text-xs text-white/40">Real-time project events</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {liveCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                               bg-indigo-500/15 border border-indigo-500/25 text-xs text-indigo-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                {liveCount} live update{liveCount !== 1 ? 's' : ''}
              </span>
            )}
            <button
              id="project-activity-refresh"
              onClick={() => fetchActivities(true)}
              disabled={isLoading}
              className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05]
                         transition-colors duration-150 disabled:opacity-50"
              title="Refresh activity"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          /* Loading skeleton */
          <div className="divide-y divide-white/[0.04]">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-white/[0.05] animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-white/[0.05] rounded-full animate-pulse w-3/5" />
                  <div className="h-2.5 bg-white/[0.03] rounded-full animate-pulse w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => fetchActivities(true)}
              className="px-4 py-2 text-xs rounded-lg bg-red-500/10 border border-red-500/20
                         text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : activities.length === 0 ? (
          <EmptyActivityState />
        ) : (
          <>
            {/* Activity list */}
            <div className="divide-y divide-white/[0.04]">
              {activities.map(activity => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  isNew={newIds.has(activity.id)}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center py-6">
                <button
                  id="project-activity-load-more"
                  onClick={() => fetchActivities(false)}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm text-white/50
                             bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]
                             rounded-xl transition-all duration-150 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Load older activity
                    </>
                  )}
                </button>
              </div>
            )}

            {/* End of feed */}
            {!hasMore && activities.length > 0 && (
              <div className="flex items-center gap-3 px-5 py-8">
                <div className="flex-1 h-px bg-white/[0.05]" />
                <span className="text-xs text-white/20">All caught up</span>
                <div className="flex-1 h-px bg-white/[0.05]" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
