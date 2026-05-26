/**
 * src/pages/workspace/WorkspaceOverview.tsx
 *
 * Premium hero dashboard:
 *  • Time-aware greeting with AI status chip
 *  • Animated stat cards with AnimatedCounter
 *  • Bento-grid project cards with spotlight hover
 *  • Timeline activity feed
 *  • AI tools quick-access strip
 */

import React, { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderOpen, Users, CheckCircle2, Plus, Sparkles,
  Code2, Sun, BookOpen, Zap, ArrowRight, Clock, Activity,
} from 'lucide-react';
import useWorkspaceStore from '../../stores/workspaceStore';
import { useProjectStore } from '../../stores/projectStore';
import { useActivityStore } from '../../stores/activityStore';
import useAuthStore from '../../stores/authStore';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import SpotlightCard from '../../components/ui/SpotlightCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import AIStatusBadge from '../../components/ui/AIStatusBadge';
import StickyActionBar from '../../components/ui/StickyActionBar';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function greeting(name?: string | null): string {
  const h = new Date().getHours();
  const who = name ? `, ${name.split(' ')[0]}` : '';
  if (h < 12) return `Good morning${who}`;
  if (h < 17) return `Good afternoon${who}`;
  return `Good evening${who}`;
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    TASK_CREATED: 'created a task', TASK_UPDATED: 'updated a task',
    TASK_DELETED: 'deleted a task', PROJECT_CREATED: 'created a project',
    PROJECT_DELETED: 'deleted a project', MEMBER_INVITED: 'invited a member',
    MEMBER_REMOVED: 'removed a member', ROLE_UPDATED: 'updated a role',
    SNIPPET_CREATED: 'added a snippet', WIKI_PAGE_CREATED: 'created a wiki page',
    PLAN_UPGRADED: 'upgraded the plan',
  };
  return map[action] ?? action.toLowerCase().replace(/_/g, ' ');
}

function actionColor(action: string): string {
  if (action.includes('CREATED')) return 'text-emerald-400 bg-emerald-500/10';
  if (action.includes('DELETED')) return 'text-red-400 bg-red-500/10';
  if (action.includes('UPDATED')) return 'text-blue-400 bg-blue-500/10';
  if (action.includes('INVITED')) return 'text-violet-400 bg-violet-500/10';
  return 'text-slate-400 bg-slate-500/10';
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, from, to,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  from: string;
  to: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl bg-[#111827] border border-[#1F2937] p-5
                 flex items-center gap-4 group
                 hover:border-[#7C3AED]/30 hover:-translate-y-0.5
                 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                 transition-all duration-300"
    >
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                       bg-gradient-to-br ${from} ${to}`}>
        {icon}
      </div>

      <div>
        <AnimatedCounter
          value={value}
          className="text-2xl font-bold text-white tabular-nums block"
        />
        <p className="text-xs font-medium text-[#9CA3AF] mt-0.5">{label}</p>
      </div>

      {/* Ambient glow */}
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-0
                       group-hover:opacity-15 transition-opacity duration-500
                       bg-gradient-to-br ${from} ${to} blur-xl`} />
    </motion.div>
  );
}

// ─── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project, workspaceId, index,
}: {
  project: { id: string; name: string; description?: string; _count?: { tasks: number; snippets: number }; createdAt: string };
  workspaceId: string;
  index: number;
}) {
  const initials = project.name.substring(0, 2).toUpperCase();
  const gradients = [
    'from-violet-500 to-indigo-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <SpotlightCard
        className="p-5 h-full"
        onClick={undefined}
      >
        <Link to={`/w/${workspaceId}/p/${project.id}/board`} className="flex flex-col gap-3 h-full">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient}
                            flex items-center justify-center text-white text-xs font-bold
                            shadow-lg flex-shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white truncate hover:text-[#A78BFA] transition-colors">
                {project.name}
              </h3>
              <p className="text-[11px] text-[#4B5563] flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {timeAgo(project.createdAt)}
              </p>
            </div>
          </div>

          {project.description && (
            <p className="text-xs text-[#9CA3AF] line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-auto pt-2 border-t border-[#1F2937]">
            <span className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {project._count?.tasks ?? 0} tasks
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
              <Code2 className="w-3.5 h-3.5" />
              {project._count?.snippets ?? 0} snippets
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#374151] ml-auto group-hover:text-[#7C3AED] transition-colors" />
          </div>
        </Link>
      </SpotlightCard>
    </motion.div>
  );
}

// ─── Activity Item ─────────────────────────────────────────────────────────────

function ActivityItem({
  activity, index,
}: {
  activity: { id: string; action: string; createdAt: string; user?: { name?: string; email: string } };
  index: number;
}) {
  const name = activity.user?.name ?? activity.user?.email ?? 'Someone';
  const initial = name.charAt(0).toUpperCase();
  const colorClass = actionColor(activity.action);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="flex items-start gap-3 py-2.5 border-b border-[#1F2937]/60 last:border-0"
    >
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-600 to-slate-700
                      flex items-center justify-center text-white text-[9px] font-bold
                      flex-shrink-0 mt-0.5">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#9CA3AF] leading-snug">
          <span className="font-semibold text-white">{name}</span>{' '}
          {actionLabel(activity.action)}
        </p>
        <p className="text-[10px] text-[#4B5563] mt-0.5">{timeAgo(activity.createdAt)}</p>
      </div>
      <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${colorClass}`}>
        {activity.action.split('_')[0]}
      </span>
    </motion.div>
  );
}

// ─── AI Tool Strip ─────────────────────────────────────────────────────────────

const AI_TOOLS = [
  { id: 'wiki-plan', label: 'Wiki Plan',      desc: 'Sprint from docs',    icon: BookOpen, color: 'from-violet-500 to-purple-600' },
  { id: 'review',    label: 'Code Review',    desc: 'AI code audit',       icon: Code2,    color: 'from-blue-500 to-indigo-600'  },
  { id: 'standup',   label: 'Standup',        desc: 'Auto-generate',       icon: Sun,      color: 'from-amber-500 to-orange-600' },
  { id: 'breakdown', label: 'Eng Plan',       desc: 'Feature to tasks',    icon: Zap,      color: 'from-emerald-500 to-teal-600' },
  { id: 'summary',   label: 'Project Health', desc: 'AI health report',    icon: Activity, color: 'from-rose-500 to-pink-600'    },
];

function AIToolStrip({ workspaceId, projectId }: { workspaceId: string; projectId?: string }) {
  if (!projectId) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#A78BFA]" />
          <h2 className="text-sm font-semibold text-white">AI Intelligence</h2>
          <AIStatusBadge status="ready" showLabel={false} />
        </div>
        <Link
          to={`/w/${workspaceId}/p/${projectId}/ai`}
          className="text-xs font-medium text-[#7C3AED] hover:text-[#A78BFA] transition-colors flex items-center gap-1"
        >
          Open workspace <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {AI_TOOLS.map((tool, i) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.25 }}
            >
              <Link
                to={`/w/${workspaceId}/p/${projectId}/ai`}
                id={`ai-tool-${tool.id}`}
                className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#111827] border border-[#1F2937]
                           hover:border-[#7C3AED]/30 hover:-translate-y-0.5
                           hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]
                           transition-all duration-200 group"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tool.color}
                                flex items-center justify-center shadow-sm`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white group-hover:text-[#A78BFA] transition-colors">
                    {tool.label}
                  </p>
                  <p className="text-[10px] text-[#4B5563] mt-0.5">{tool.desc}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function WorkspaceOverview(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const { activeWorkspace, members, isLoading: wsLoading } = useWorkspaceStore();
  const { projects } = useProjectStore();
  const { activities, isLoading: actLoading, fetchActivities } = useActivityStore();
  const user = useAuthStore((s) => s.user);

  const headerRef = useRef<HTMLDivElement>(null);
  const activeProjectId = projects[0]?.id;

  useEffect(() => {
    if (workspaceId) {
      fetchActivities(workspaceId, true).catch(console.error);
    }
  }, [workspaceId, fetchActivities]);

  const totalTasks = projects.reduce((acc, p) => acc + (p._count?.tasks ?? 0), 0);
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  if (wsLoading && !activeWorkspace) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-3 gap-4">
          <SkeletonLoader.StatCard />
          <SkeletonLoader.StatCard />
          <SkeletonLoader.StatCard />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SkeletonLoader.Card className="h-40" />
          <SkeletonLoader.Card className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Sticky action bar */}
      <StickyActionBar title={activeWorkspace?.name ?? 'Overview'} triggerRef={headerRef as React.RefObject<HTMLElement>}>
        {workspaceId && (
          <Link
            to={`/w/${workspaceId}/projects`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white
                       bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors"
          >
            + New Project
          </Link>
        )}
      </StickyActionBar>

      <div className="px-6 md:px-8 pt-8 pb-6 space-y-8 max-w-7xl mx-auto">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div ref={headerRef} className="relative">
          {/* Radial glow behind greeting */}
          <div className="absolute -top-8 left-0 w-64 h-32 rounded-full
                          bg-[#7C3AED]/8 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AIStatusBadge status="ready" />
                <span className="text-[11px] text-[#4B5563]">
                  {projects.length} projects · {members.length} members
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {greeting(user?.name)}
              </h1>
              <p className="text-sm text-[#9CA3AF] mt-1">
                {activeWorkspace?.name} workspace ·{' '}
                <span className="text-[#A78BFA]">AI tools ready to assist</span>
              </p>
            </div>

            {/* Quick actions */}
            {workspaceId && (
              <div className="flex items-center gap-2">
                <Link
                  to={`/w/${workspaceId}/projects`}
                  id="hero-new-project-btn"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                             bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold
                             transition-all duration-200 hover:shadow-[0_0_20px_rgba(124,58,237,0.35)]
                             hover:-translate-y-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Project
                </Link>
                {activeProjectId && (
                  <Link
                    to={`/w/${workspaceId}/p/${activeProjectId}/ai`}
                    id="hero-ai-btn"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                               bg-[#111827] border border-[#1F2937] hover:border-[#7C3AED]/40
                               text-[#9CA3AF] hover:text-white text-xs font-semibold
                               transition-all duration-200"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                    Ask AI
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Stat cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Active Projects"
            value={projects.length}
            from="from-blue-500"
            to="to-indigo-600"
            icon={<FolderOpen className="w-5 h-5 text-white" />}
          />
          <StatCard
            label="Team Members"
            value={members.length}
            from="from-violet-500"
            to="to-purple-600"
            icon={<Users className="w-5 h-5 text-white" />}
          />
          <StatCard
            label="Tasks Across Projects"
            value={totalTasks}
            from="from-emerald-500"
            to="to-teal-600"
            icon={<CheckCircle2 className="w-5 h-5 text-white" />}
          />
        </div>

        {/* ── AI tool strip ──────────────────────────────────────────────────── */}
        {workspaceId && (
          <AIToolStrip workspaceId={workspaceId} projectId={activeProjectId} />
        )}

        {/* ── Projects + Activity ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Projects — 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#9CA3AF]" />
                <h2 className="text-sm font-semibold text-white">Recent Projects</h2>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold
                                 bg-[#1F2937] text-[#9CA3AF]">
                  {projects.length}
                </span>
              </div>
              {workspaceId && (
                <Link
                  to={`/w/${workspaceId}/projects`}
                  className="text-xs font-medium text-[#7C3AED] hover:text-[#A78BFA]
                             transition-colors flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {projects.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-dashed border-[#1F2937] bg-[#111827]/40
                           p-12 text-center relative overflow-hidden"
              >
                {/* Floating particles */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-[#7C3AED]/40"
                    style={{ left: `${15 + i * 18}%`, top: `${20 + (i % 3) * 20}%` }}
                    animate={{ y: [-4, 4, -4], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
                <div className="w-14 h-14 rounded-2xl bg-[#1F2937] flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-7 h-7 text-[#4B5563]" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">No projects yet</p>
                <p className="text-xs text-[#4B5563] mb-6 max-w-xs mx-auto">
                  Create your first project and unlock AI-powered collaboration tools.
                </p>
                {workspaceId && (
                  <div className="flex flex-col items-center gap-2">
                    <Link
                      to={`/w/${workspaceId}/projects`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                                 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold
                                 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Project
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      {['Plan a sprint', 'Review code', 'Generate standup'].map((prompt) => (
                        <button
                          key={prompt}
                          className="px-3 py-1 rounded-full text-[11px] font-medium
                                     bg-[#1F2937] border border-[#374151] text-[#9CA3AF]
                                     hover:text-white hover:border-[#7C3AED]/50 transition-colors"
                        >
                          ✨ {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentProjects.map((project, i) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    workspaceId={workspaceId!}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed — 1/3 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#9CA3AF]" />
                <h2 className="text-sm font-semibold text-white">Live Activity</h2>
                {!actLoading && activities.length > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-[#111827] border border-[#1F2937] px-4 py-2 min-h-[200px]">
              {actLoading && activities.length === 0 ? (
                <div className="py-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <SkeletonLoader className="w-6 h-6 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <SkeletonLoader.Line width="w-3/4" />
                        <SkeletonLoader.Line width="w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#1F2937] flex items-center justify-center mb-3">
                    <Activity className="w-4.5 h-4.5 text-[#4B5563]" />
                  </div>
                  <p className="text-xs font-semibold text-[#9CA3AF]">No activity yet</p>
                  <p className="text-[11px] text-[#4B5563] mt-1">Events appear here in real time.</p>
                </div>
              ) : (
                <div>
                  {activities.slice(0, 12).map((activity, i) => (
                    <ActivityItem key={activity.id} activity={activity} index={i} />
                  ))}
                  {workspaceId && activities.length > 12 && (
                    <Link
                      to={`/w/${workspaceId}/activity`}
                      className="block text-center text-xs text-[#7C3AED] hover:text-[#A78BFA] py-3 transition-colors"
                    >
                      View full feed →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
