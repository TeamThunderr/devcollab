/**
 * src/pages/workspace/WorkspaceOverview.tsx
 *
 * The true workspace dashboard — /w/:workspaceId index route.
 * Shows:
 *   • 3 quick-stat cards (Active Projects, Total Members, Tasks Completed)
 *   • Recent Projects grid
 *   • Live Activity Feed column
 */

import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import useWorkspaceStore from "../../stores/workspaceStore";
import { useProjectStore } from "../../stores/projectStore";
import { useActivityStore } from "../../stores/activityStore";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    TASK_CREATED:      "created a task",
    TASK_UPDATED:      "updated a task",
    TASK_DELETED:      "deleted a task",
    PROJECT_CREATED:   "created a project",
    PROJECT_DELETED:   "deleted a project",
    MEMBER_INVITED:    "invited a member",
    MEMBER_REMOVED:    "removed a member",
    ROLE_UPDATED:      "updated a member role",
    SNIPPET_CREATED:   "added a snippet",
    WIKI_PAGE_CREATED: "created a wiki page",
    PLAN_UPGRADED:     "upgraded the plan",
  };
  return map[action] ?? action.toLowerCase().replace(/_/g, " ");
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactElement;
  accent: string; // tailwind gradient classes
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#17191d] border border-white/[0.04] p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        <p className="text-xs font-medium text-slate-400 mt-0.5">{label}</p>
      </div>
      {/* subtle glow */}
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 blur-xl ${accent}`} />
    </div>
  );
}

// ─── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  workspaceId,
}: {
  project: { id: string; name: string; description?: string; _count?: { tasks: number; snippets: number }; createdAt: string };
  workspaceId: string;
}) {
  const initials = project.name.substring(0, 2).toUpperCase();
  return (
    <Link
      to={`/w/${workspaceId}/p/${project.id}/board`}
      className="group flex flex-col gap-3 rounded-2xl bg-[#17191d] border border-white/[0.04]
                 hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/10
                 p-5 transition-all duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
            {project.name}
          </h3>
          <p className="text-[11px] text-slate-500">
            {timeAgo(project.createdAt)}
          </p>
        </div>
      </div>

      {project.description && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-4 mt-auto pt-1.5 border-t border-white/[0.04]">
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {project._count?.tasks ?? 0} tasks
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          {project._count?.snippets ?? 0} snippets
        </span>
      </div>
    </Link>
  );
}

// ─── Activity item ────────────────────────────────────────────────────────────

function ActivityItem({
  activity,
}: {
  activity: { id: string; action: string; createdAt: string; user?: { name?: string; email: string } };
}) {
  const name = activity.user?.name ?? activity.user?.email ?? "Someone";
  const initials = name.substring(0, 1).toUpperCase();

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-650 to-slate-750 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-300 leading-snug">
          <span className="font-semibold text-white">{name}</span>{" "}
          {actionLabel(activity.action)}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(activity.createdAt)}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkspaceOverview(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const { activeWorkspace, members, isLoading: wsLoading } = useWorkspaceStore();
  const { projects, fetchProjects } = useProjectStore();
  const { activities, isLoading: actLoading, fetchActivities } = useActivityStore();

  useEffect(() => {
    if (workspaceId) {
      fetchProjects(workspaceId).catch(console.error);
      fetchActivities(workspaceId, true).catch(console.error);
    }
  }, [workspaceId, fetchProjects, fetchActivities]);

  // Derived stats
  const totalTasks = projects.reduce((acc, p) => acc + (p._count?.tasks ?? 0), 0);
  const recentProjects = [...projects].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 6);

  if (wsLoading && !activeWorkspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {activeWorkspace?.name ?? "Workspace"}{" "}
          <span className="text-slate-500 font-normal">Overview</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          A quick look at what's happening across your workspace.
        </p>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Active Projects"
          value={projects.length}
          accent="bg-gradient-to-br from-blue-500 to-indigo-600"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="Total Members"
          value={members.length}
          accent="bg-gradient-to-br from-violet-500 to-purple-600"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Tasks Across Projects"
          value={totalTasks}
          accent="bg-gradient-to-br from-emerald-500 to-teal-600"
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* ── Main grid: Recent Projects + Activity Feed ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Projects — takes 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Recent Projects</h2>
            {workspaceId && (
              <Link
                to={`/w/${workspaceId}/projects`}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                View all
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.04] bg-[#17191d]/40 p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#1e2025] flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-200">No projects yet</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">Create your first project to get started.</p>
              {workspaceId && (
                <Link
                  to={`/w/${workspaceId}/projects`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  New Project
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  workspaceId={workspaceId!}
                />
              ))}
            </div>
          )}
        </div>

        {/* Live Activity Feed — takes 1/3 width */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">Live Activity</h2>
          <div className="rounded-2xl bg-[#17191d] border border-white/[0.04] px-4 py-2 min-h-[200px]">
            {actLoading && activities.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <LoadingSpinner size="sm" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-9 h-9 rounded-full bg-[#1e2025] flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-slate-300">No activity yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Events will appear here in real time.</p>
              </div>
            ) : (
              <div>
                {activities.slice(0, 12).map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
                {workspaceId && activities.length > 12 && (
                  <Link
                    to={`/w/${workspaceId}/activity`}
                    className="block text-center text-xs text-indigo-400 hover:text-indigo-300 py-3 transition-colors"
                  >
                    View full activity feed →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
