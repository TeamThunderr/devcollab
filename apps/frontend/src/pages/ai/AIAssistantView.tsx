/**
 * src/pages/ai/AIAssistantView.tsx
 *
 * Premium AI workspace — bento-grid layout replacing tab bar.
 * Features:
 *  • Health snapshot with animated stats
 *  • Bento grid tool selector (spotlight cards, different sizes)
 *  • Framer Motion AnimatePresence panel transitions
 *  • AI confidence indicators
 *  • Streaming state awareness
 */

import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Eye, Zap, CheckCircle2, ClipboardList,
  Code2, BarChart2, Sun, Sparkles, X, ArrowRight,
  Activity,
} from 'lucide-react';
import CodeReviewPanel from '../../components/ai/CodeReviewPanel';
import ProjectSummaryPanel from '../../components/ai/ProjectSummaryPanel';
import StandupPanel from '../../components/ai/StandupPanel';
import TaskBreakdownPanel from '../../components/ai/TaskBreakdownPanel';
import WikiPlanPanel from '../../components/ai/WikiPlanPanel';
import { useTaskStore } from '../../stores/taskStore';
import { cn } from '../../lib/utils';
import SpotlightCard from '../../components/ui/SpotlightCard';
import AIStatusBadge from '../../components/ui/AIStatusBadge';
import AIConfidenceRing from '../../components/ui/AIConfidenceRing';

// ─── Health snapshot ──────────────────────────────────────────────────────────

function HealthSnapshot({ projectId }: { projectId: string }) {
  const tasks = useTaskStore((s) => s.tasks).filter((t) => t.projectId === projectId);
  const now = Date.now();

  const stats = useMemo(() => {
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate).getTime() < now && t.status !== 'DONE',
    ).length;
    const inReview = tasks.filter((t) => t.status === 'IN_REVIEW').length;
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    return { overdue, inReview, total, done, inProgress };
  }, [tasks, now]);

  if (stats.total === 0) return null;

  const pct = Math.round((stats.done / stats.total) * 100);
  const healthScore = Math.max(0, Math.min(100, pct - stats.overdue * 5));

  const signals = [
    { label: 'Overdue',     value: stats.overdue,    Icon: AlertTriangle, pos: stats.overdue > 0, neg: true  },
    { label: 'In Review',   value: stats.inReview,   Icon: Eye,           pos: stats.inReview > 0, neg: false },
    { label: 'In Progress', value: stats.inProgress, Icon: Zap,           pos: stats.inProgress > 0, neg: false },
    { label: 'Done',        value: stats.done,        Icon: CheckCircle2,  pos: stats.done > 0, neg: false },
  ];

  const colorMap = (s: typeof signals[0]) => {
    if (s.neg && s.pos) return { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', icon: 'text-red-400' };
    if (s.pos) return { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-400' };
    return { bg: 'bg-[#111827] border-[#1F2937]', text: 'text-[#4B5563]', icon: 'text-[#374151]' };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex flex-wrap items-center gap-4 p-4 rounded-2xl
                 bg-[#111827] border border-[#1F2937]"
    >
      <div className="flex items-center gap-3">
        <AIConfidenceRing score={healthScore} size={52} />
        <div>
          <p className="text-xs font-bold text-white">Project Health</p>
          <p className="text-[11px] text-[#4B5563]">{stats.total} tasks total</p>
        </div>
      </div>

      <div className="h-8 w-px bg-[#1F2937] hidden sm:block" />

      <div className="flex flex-wrap gap-2 flex-1">
        {signals.map((s) => {
          const colors = colorMap(s);
          return (
            <div
              key={s.label}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold',
                colors.bg,
              )}
            >
              {s.pos && s.neg && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping absolute" />
              )}
              <s.Icon className={cn('w-3.5 h-3.5', colors.icon)} />
              <span className={cn('font-black text-base leading-none', colors.text)}>{s.value}</span>
              <span className={cn('text-[10px] font-semibold', colors.text)}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 ml-auto">
        <div className="h-1.5 w-24 rounded-full bg-[#1F2937] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <span className="text-[11px] font-bold text-[#9CA3AF]">{pct}%</span>
      </div>
    </motion.div>
  );
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

type TabId = 'wiki-plan' | 'review' | 'summary' | 'standup' | 'breakdown';

interface Tool {
  id: TabId;
  label: string;
  desc: string;
  Icon: React.FC<{ className?: string }>;
  gradient: string;
  size: 'large' | 'medium' | 'small';
  tag?: string;
  confidence?: number;
}

const TOOLS: Tool[] = [
  {
    id: 'wiki-plan',
    label: 'Wiki Plan',
    desc: 'Transform your documentation into a full sprint roadmap with AI-powered task breakdowns and timelines.',
    Icon: ClipboardList,
    gradient: 'from-violet-500 via-purple-500 to-indigo-600',
    size: 'large',
    tag: 'Most Used',
    confidence: 94,
  },
  {
    id: 'review',
    label: 'Code Review',
    desc: 'AI audits your code for bugs, security issues, and best practices.',
    Icon: Code2,
    gradient: 'from-blue-500 to-cyan-600',
    size: 'medium',
    tag: 'New',
    confidence: 88,
  },
  {
    id: 'summary',
    label: 'Project Summary',
    desc: 'Health report, velocity charts, and risk indicators.',
    Icon: BarChart2,
    gradient: 'from-emerald-500 to-teal-600',
    size: 'medium',
    confidence: 91,
  },
  {
    id: 'standup',
    label: 'Standup',
    desc: 'Generate team standup from activity.',
    Icon: Sun,
    gradient: 'from-amber-500 to-orange-600',
    size: 'small',
    confidence: 82,
  },
  {
    id: 'breakdown',
    label: 'Eng Plan',
    desc: 'Feature → tasks + architecture.',
    Icon: Zap,
    gradient: 'from-rose-500 to-pink-600',
    size: 'small',
    confidence: 86,
  },
];

// ─── Bento tool card ──────────────────────────────────────────────────────────

function ToolCard({
  tool, isActive, onClick,
}: {
  tool: Tool;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tool.Icon;
  const isLarge = tool.size === 'large';
  const isMedium = tool.size === 'medium';

  return (
    <SpotlightCard
      onClick={onClick}
      className={cn(
        'relative cursor-pointer transition-all duration-300 overflow-hidden',
        isLarge && 'sm:col-span-2 sm:row-span-2',
        isMedium && 'sm:col-span-1 sm:row-span-1',
        isActive
          ? 'border-[#7C3AED]/60 shadow-[0_0_0_1px_rgba(124,58,237,0.25),0_8px_32px_rgba(0,0,0,0.5)]'
          : '',
      )}
      id={`ai-tool-card-${tool.id}`}
    >
      {/* Active indicator bar */}
      {isActive && (
        <motion.div
          layoutId="active-tool-bar"
          className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}

      <div className={cn('p-5 flex gap-4 h-full', isLarge ? 'flex-col' : 'flex-row items-start')}>
        {/* Icon + confidence */}
        <div className={cn('flex items-start gap-3', isLarge && 'w-full justify-between')}>
          <div className={cn(
            `rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center`,
            `shadow-lg flex-shrink-0`,
            isLarge ? 'w-12 h-12' : 'w-9 h-9',
          )}>
            <Icon className={isLarge ? 'w-6 h-6 text-white' : 'w-4.5 h-4.5 text-white'} />
          </div>

          {isLarge && tool.confidence && (
            <AIConfidenceRing score={tool.confidence} size={44} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className={cn('font-bold text-white', isLarge ? 'text-base' : 'text-sm')}>
              {tool.label}
            </h3>
            {tool.tag && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold
                               bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/20">
                {tool.tag}
              </span>
            )}
            {isActive && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold
                               bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            )}
          </div>

          <p className={cn(
            'text-[#9CA3AF] leading-relaxed',
            isLarge ? 'text-sm' : 'text-[11px] line-clamp-2',
          )}>
            {tool.desc}
          </p>

          {isLarge && (
            <div className="flex items-center gap-2 mt-4">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                                 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold
                                 transition-all duration-200 hover:shadow-[0_0_16px_rgba(124,58,237,0.4)]">
                <Sparkles className="w-3.5 h-3.5" />
                {isActive ? 'Open Tool' : 'Launch'}
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
              {!isActive && (
                <span className="text-[11px] text-[#4B5563]">Click to activate</span>
              )}
            </div>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
}

// ─── Active panel wrapper ─────────────────────────────────────────────────────

function ActivePanel({
  activeTab, projectId, workspaceId, onClose, onTasksAdded,
}: {
  activeTab: TabId;
  projectId: string;
  workspaceId: string;
  onClose: () => void;
  onTasksAdded: (ids: string[]) => void;
}) {
  const tool = TOOLS.find((t) => t.id === activeTab)!;
  const Icon = tool.Icon;

  return (
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-[#111827] border border-[#1F2937] overflow-hidden"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3.5
                      border-b border-[#1F2937] bg-[#0F1629]">
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${tool.gradient}
                          flex items-center justify-center shadow-sm`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{tool.label}</h2>
            <p className="text-[10px] text-[#4B5563]">{tool.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AIStatusBadge status="ready" showLabel={false} />
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="w-7 h-7 rounded-lg flex items-center justify-center
                       text-[#4B5563] hover:text-white hover:bg-[#1F2937] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Panel body */}
      <div className="p-5 min-h-[340px]">
        {activeTab === 'wiki-plan' && (
          <WikiPlanPanel projectId={projectId} workspaceId={workspaceId} />
        )}
        {activeTab === 'review' && <CodeReviewPanel />}
        {activeTab === 'summary' && <ProjectSummaryPanel projectId={projectId} />}
        {activeTab === 'standup' && <StandupPanel projectId={projectId} />}
        {activeTab === 'breakdown' && (
          <TaskBreakdownPanel projectId={projectId} onTasksAdded={onTasksAdded} />
        )}
      </div>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AIAssistantView(): React.ReactElement {
  const { projectId, workspaceId } = useParams<{ projectId: string; workspaceId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<TabId | null>(null);

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-[#111827] border border-[#1F2937]
                        flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-[#4B5563]" />
        </div>
        <p className="text-sm font-semibold text-white mb-1">No project selected</p>
        <p className="text-xs text-[#4B5563]">Select a project to access AI tools.</p>
      </div>
    );
  }

  function handleTasksAdded(taskIds: string[]) {
    navigate(`/w/${workspaceId}/p/${projectId}/board`, {
      state: { aiAddedTaskIds: taskIds },
    });
  }

  const handleToolClick = (id: TabId) => {
    setActiveTab((prev) => (prev === id ? null : id));
  };

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden">
      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-[#1F2937]">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500
                            flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.35)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">
                Team Intelligence Center
              </h1>
              <p className="text-[11px] text-[#4B5563] mt-0.5">
                Powered by Devcollab 2.0 · Real project context
              </p>
            </div>
          </div>
          <AIStatusBadge status="ready" />
        </div>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Health snapshot */}
        <HealthSnapshot projectId={projectId} />

        {/* Bento grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[#9CA3AF]" />
            <h2 className="text-sm font-semibold text-white">AI Tools</h2>
            <span className="text-[11px] text-[#4B5563]">
              {activeTab ? 'Click the active tool to collapse' : 'Click any tool to activate'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 grid-rows-auto gap-3">
            {TOOLS.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isActive={activeTab === tool.id}
                onClick={() => handleToolClick(tool.id)}
              />
            ))}
          </div>
        </div>

        {/* Active panel */}
        <AnimatePresence mode="wait">
          {activeTab && (
            <ActivePanel
              key={activeTab}
              activeTab={activeTab}
              projectId={projectId}
              workspaceId={workspaceId ?? ''}
              onClose={() => setActiveTab(null)}
              onTasksAdded={handleTasksAdded}
            />
          )}
        </AnimatePresence>

        {/* Footer */}
        <p className="text-center text-[10px] text-[#374151] pb-4">
          Powered by Devcollab 2.0 Flash · AI responses may vary
        </p>
      </div>
    </div>
  );
}
