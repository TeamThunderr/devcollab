import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CodeReviewPanel from "../../components/ai/CodeReviewPanel";
import ProjectSummaryPanel from "../../components/ai/ProjectSummaryPanel";
import StandupPanel from "../../components/ai/StandupPanel";
import TaskBreakdownPanel from "../../components/ai/TaskBreakdownPanel";
import { useTaskStore } from "../../stores/taskStore";

// ─── Project health snapshot ─────────────────────────────────────────────────

function HealthSnapshot({ projectId }: { projectId: string }): React.ReactElement | null {
  const tasks = useTaskStore((s) => s.tasks).filter(
    (t) => t.projectId === projectId
  );

  const now = Date.now();

  const stats = useMemo(() => {
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate).getTime() < now && t.status !== "DONE"
    ).length;
    const inReview = tasks.filter((t) => t.status === "IN_REVIEW").length;
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "DONE").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    return { overdue, inReview, total, done, inProgress };
  }, [tasks, now]);

  if (stats.total === 0) return null;

  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const signals = [
    {
      label: "Overdue",
      value: stats.overdue,
      icon: "⚠️",
      color: stats.overdue > 0
        ? "border-red-500/30 bg-red-500/10 text-red-400"
        : "border-white/[0.05] bg-white/[0.02] text-slate-500",
      pulse: stats.overdue > 0,
    },
    {
      label: "In Review",
      value: stats.inReview,
      icon: "👁️",
      color: stats.inReview > 0
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : "border-white/[0.05] bg-white/[0.02] text-slate-500",
      pulse: false,
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: "⚡",
      color: stats.inProgress > 0
        ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
        : "border-white/[0.05] bg-white/[0.02] text-slate-500",
      pulse: false,
    },
    {
      label: "Completed",
      value: stats.done,
      icon: "✅",
      color: stats.done > 0
        ? "border-green-500/30 bg-green-500/10 text-green-400"
        : "border-white/[0.05] bg-white/[0.02] text-slate-500",
      pulse: false,
    },
  ];

  return (
    <div className="mb-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
          Project Health
        </p>
        <div className="flex items-center gap-2">
          <div className="h-1 w-24 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400">{pct}% done</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {signals.map((s) => (
          <div
            key={s.label}
            className={`relative rounded-xl border px-3 py-2.5 flex flex-col gap-1 transition-all duration-200 ${s.color}`}
          >
            {s.pulse && s.value > 0 && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            )}
            <span className="text-base leading-none">{s.icon}</span>
            <span className="text-xl font-black leading-none">{s.value}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId = "review" | "summary" | "standup" | "breakdown";

interface Tab {
  id: TabId;
  label: string;
  emoji: string;
  desc: string;
}

const TABS: Tab[] = [
  { id: "review",    label: "Code Review",      emoji: "⭐", desc: "Audit your code instantly" },
  { id: "summary",   label: "Project Summary",   emoji: "📊", desc: "AI health report" },
  { id: "standup",   label: "Standup",           emoji: "☀️", desc: "Generate from activity" },
  { id: "breakdown", label: "Eng Plan",          emoji: "⚡", desc: "Feature → tasks" },
];

// ─── Page component ───────────────────────────────────────────────────────────

export default function AIAssistantView(): React.ReactElement {
  const { projectId, workspaceId } = useParams<{ projectId: string; workspaceId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<TabId>("review");

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No project selected.
      </div>
    );
  }

  function handleTasksAdded(taskIds: string[]) {
    // Redirect to board with highlight state
    navigate(`/w/${workspaceId}/p/${projectId}/board`, {
      state: { aiAddedTaskIds: taskIds },
    });
  }

  return (
    <div className="h-full flex flex-col bg-[#121316] overflow-hidden">
      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
            <span className="text-lg leading-none">✨</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">
              Team Intelligence Center
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Powered by Gemini 2.0 · Real project context
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Health snapshot */}
        <HealthSnapshot projectId={projectId} />

        {/* Tab bar — with active glow */}
        <div className="flex gap-1 mb-5 bg-black/20 rounded-xl p-1 border border-white/[0.04]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
              }`}
            >
              {/* Active background glow */}
              {activeTab === tab.id && (
                <span className="absolute inset-0 rounded-lg bg-gradient-to-b from-violet-500/20 to-indigo-500/10 border border-violet-500/20 shadow-sm shadow-violet-500/10" />
              )}
              <span className="relative z-10 text-base leading-none">{tab.emoji}</span>
              <span className="relative z-10 hidden sm:block text-[10px] font-bold">{tab.label}</span>
              {/* Active underline */}
              {activeTab === tab.id && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-violet-400" />
              )}
            </button>
          ))}
        </div>

        {/* Active panel */}
        <div className="bg-[#17191d] border border-white/[0.04] rounded-2xl p-5 min-h-[320px]">
          {activeTab === "review"    && <CodeReviewPanel />}
          {activeTab === "summary"   && <ProjectSummaryPanel projectId={projectId} />}
          {activeTab === "standup"   && <StandupPanel projectId={projectId} />}
          {activeTab === "breakdown" && (
            <TaskBreakdownPanel
              projectId={projectId}
              onTasksAdded={handleTasksAdded}
            />
          )}
        </div>
      </div>
    </div>
  );
}
