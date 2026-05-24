import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { useTaskStore } from '../../stores/taskStore';
import { useProjectStore } from '../../stores/projectStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';
import { useBillingStore } from '../../stores/billingStore';
import KanbanColumn from '../../components/kanban/KanbanColumn';
import TaskModal from '../../components/kanban/TaskModal';
import { DatePicker } from '../../components/ui/DatePicker';
import { Task, TaskStatus, TaskPriority } from '../../types';
import {
  Search, Bell, ChevronDown, Sparkles, Users, Zap, Compass,
  Briefcase, Layers, Layout, Plus, Trash2, Crown,
  Clock, BarChart3, Bot, Settings2, ShieldCheck, PlayCircle
} from 'lucide-react';

const ROLES = ['Owner', 'Admin', 'Project Manager', 'Developer', 'Designer', 'Tester'] as const;
type ProjectRole = typeof ROLES[number];

const PERMISSIONS = ['Create Task', 'Edit Task', 'Delete Task', 'Move Task', 'Invite Members', 'Create Sprint', 'Manage Board'] as const;
type ProjectPermission = typeof PERMISSIONS[number];

interface ProjectWorkspaceConfig {
  name: string;
  description: string;
  projectType: string;
  visibility: string;
  members: { userId: string; role: ProjectRole }[];
  permissions: Record<ProjectRole, ProjectPermission[]>;
  columns: { id: string; title: string }[];
  sprints: {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
    goal?: string;
    status: 'active' | 'upcoming' | 'completed';
    taskIds: string[];
  }[];
  activities: { id: string; userName: string; details: string; timestamp: string }[];
  notifications: { id: string; message: string; read: boolean; timestamp: string }[];
}

const DEFAULT_PERMISSIONS: Record<ProjectRole, ProjectPermission[]> = {
  Owner: [...PERMISSIONS],
  Admin: [...PERMISSIONS],
  'Project Manager': ['Create Task', 'Edit Task', 'Delete Task', 'Move Task', 'Create Sprint', 'Manage Board'],
  Developer: ['Create Task', 'Edit Task', 'Move Task', 'Create Sprint'],
  Designer: ['Create Task', 'Edit Task', 'Move Task'],
  Tester: ['Create Task', 'Edit Task', 'Move Task'],
};

const DEFAULT_COLUMNS = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'IN_REVIEW', title: 'In Review' },
  { id: 'DONE', title: 'Completed' },
];

export default function TasksPage(): React.ReactElement {
  const { workspaceSlug, pid } = useParams<{ workspaceSlug: string; pid: string }>();
  const { tasks, loading, error, fetchTasksByProject, createTask, updateTask, deleteTask, addComment } = useTaskStore();
  const { members } = useWorkspaceStore();
  const { user } = useAuthStore();

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const userRole = currentUserMember?.role || 'VIEWER';
  const canEditTasks = userRole !== 'VIEWER';

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [quickTaskCol, setQuickTaskCol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Project Switching & Modals States
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [starredProjects, setStarredProjects] = useState<string[]>([]);
  const [pinnedProjects, setPinnedProjects] = useState<string[]>([]);

  // Page Entry Loading Premium States
  const [isInitializing, setIsInitializing] = useState(true);
  const [initProgress, setInitProgress] = useState(0);

  // Wizard Onboarding States
  const [wizardStep, setWizardStep] = useState(1);
  const [onboardingAnswers, setOnboardingAnswers] = useState({
    buildType: '',
    teamSize: '',
    priority: '',
    workflow: '',
    style: ''
  });

  // Wizard Syncing & Compilation state
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilingProgress, setCompilingProgress] = useState(0);
  const [compilingStatusText, setCompilingStatusText] = useState('Bootstrapping environment...');

  // Sprints Form States
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');

  // AI suggestions
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<{ title: string; description: string; priority: TaskPriority }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Instant Task creation overlay form variables
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPrio, setTaskPrio] = useState<TaskPriority>('P1');
  const [taskDue, setTaskDue] = useState<Date | undefined>();

  // Local optimistic task tracking
  const [localTasks, setLocalTasks] = useState<Task[]>([]);

  // Fetch initial project parameters
  useEffect(() => {
    if (activeWorkspaceId) {
      void fetchProjects(activeWorkspaceId);
      void fetchWorkspaceDetails(activeWorkspaceId);
      void fetchSubscription(activeWorkspaceId);

      // Load starred / pinned project arrays from local storage
      const starred = localStorage.getItem(`devcollab_starred_projects_${activeWorkspaceId}`);
      if (starred) setStarredProjects(JSON.parse(starred));
      const pinned = localStorage.getItem(`devcollab_pinned_projects_${activeWorkspaceId}`);
      if (pinned) setPinnedProjects(JSON.parse(pinned));
    }
  }, [activeWorkspaceId, fetchProjects, fetchWorkspaceDetails, fetchSubscription]);

  // Handle redirect from standard project-test-456 route to first database project
  useEffect(() => {
    if (pid === 'project-test-456' && projects.length > 0) {
      navigate(`/${activeWorkspaceId}/projects/${projects[0].id}`, { replace: true });
    }
  }, [pid, projects, activeWorkspaceId, navigate]);

  // Load project configuration from localStorage
  const loadConfig = () => {
    if (activeWorkspaceId && activeProjectId) {
      const stored = localStorage.getItem(`devcollab_project_workspace_${activeProjectId}`);
      if (stored) {
        try {
          setConfig(JSON.parse(stored));
        } catch {
          setConfig(null);
        }
      } else {
        setConfig(null);
      }
    }
  };

  useEffect(() => {
    loadConfig();
  }, [activeWorkspaceId, activeProjectId]);

  useEffect(() => {
    if (activeProjectId && activeProjectId !== '00000000-0000-0000-0000-000000000456') {
      void fetchTasksByProject(activeProjectId);
    }
  }, [fetchTasksByProject, activeProjectId]);

  // Sync tasks to local optimistic state
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Premium typography & styles injection
  useEffect(() => {
    const link1 = document.createElement('link');
    link1.rel = 'preconnect';
    link1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = 'https://fonts.gstatic.com';
    link2.crossOrigin = 'anonymous';
    document.head.appendChild(link2);

    const link3 = document.createElement('link');
    link3.rel = 'stylesheet';
    link3.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap';
    document.head.appendChild(link3);

    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      .premium-font {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      }
      .premium-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .premium-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .premium-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.18);
        border-radius: 9999px;
      }
      .premium-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(148, 163, 184, 0.35);
      }
      .premium-glass {
        background: rgba(255, 255, 255, 0.65);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }
      .dark .premium-glass {
        background: rgba(10, 10, 15, 0.65);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      }
      @keyframes slideInFromRight {
        from { transform: translateX(24px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideInFromLeft {
        from { transform: translateX(-24px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .animate-slide-in-right {
        animation: slideInFromRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .animate-slide-in-left {
        animation: slideInFromLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
    `;
    document.head.appendChild(styleTag);

    return () => {
      document.head.removeChild(link1);
      document.head.removeChild(link2);
      document.head.removeChild(link3);
      document.head.removeChild(styleTag);
    };
  }, []);

  // Premium loading transition simulation on initial load
  useEffect(() => {
    setIsInitializing(true);
    setInitProgress(5);
    const interval = setInterval(() => {
      setInitProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsInitializing(false), 200);
          return 100;
        }
        const step = Math.floor(Math.random() * 20) + 10;
        return Math.min(prev + step, 100);
      });
    }, 70);
    return () => clearInterval(interval);
  }, [activeProjectId]);

  const activeProjectObject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId);
  }, [projects, activeProjectId]);

  // Permissions mapping
  const userRole = config?.members?.find(m => m.userId === currentUser?.id)?.role || 'Owner';
  const userPermissions = config?.permissions?.[userRole] || [...PERMISSIONS];
  const canCreateTask = userPermissions.includes('Create Task');
  const canMoveTask = userPermissions.includes('Move Task');
  const canCreateSprint = userPermissions.includes('Create Sprint');
  const canManageBoard = userPermissions.includes('Manage Board');

  const backlogTasks = useMemo(() => {
    if (!config) return [];
    const sprintTaskIds = new Set((config.sprints || []).flatMap(s => s.taskIds || []));
    return localTasks.filter(t => !sprintTaskIds.has(t.id));
  }, [localTasks, config]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return localTasks;
    return localTasks.filter(t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [localTasks, searchQuery]);

  const updateProjectConfig = (updater: (prev: ProjectWorkspaceConfig) => ProjectWorkspaceConfig) => {
    if (!config || !activeProjectId) return;
    const next = updater(config);
    localStorage.setItem(`devcollab_project_workspace_${activeProjectId}`, JSON.stringify(next));
    setConfig(next);
  };

  const logActivity = (details: string) => {
    updateProjectConfig(prev => ({
      ...prev,
      activities: [{ id: `act-${Date.now()}`, userName: currentUser?.name || 'Workspace Member', details, timestamp: new Date().toISOString() }, ...(prev.activities || [])]
    }));
  };

  // Optimistic UI task creation handler
  const handleCreateTaskSubmit = async () => {
    if (!taskTitle.trim() || !activeProjectId) return;
    const startStatus = quickTaskCol || config?.columns?.[0]?.id || 'TODO';

    const creatorUser = currentUser ? {
      id: currentUser.id,
      name: currentUser.name || undefined,
      email: currentUser.email,
    } : {
      id: 'system',
      name: 'Workspace Member',
      email: 'member@devcollab.local'
    };

    const optimisticId = `opt-${Date.now()}`;

    const optimisticTask: Task = {
      id: optimisticId,
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
      status: (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(startStatus) ? startStatus : 'TODO') as TaskStatus,
      priority: taskPrio,
      dueDate: taskDue ? taskDue.toISOString() : undefined,
      projectId: activeProjectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: creatorUser,
      comments: []
    };

    // Close form modal instantly and clear variables
    setTaskTitle('');
    setTaskDesc('');
    setQuickTaskCol(null);
    setShowTaskForm(false);

    // Apply Optimistic Update
    setLocalTasks(prev => [optimisticTask, ...prev]);
    logActivity(`created task: "${optimisticTask.title}"`);

    try {
      const savedTask = await createTask({
        title: optimisticTask.title,
        description: optimisticTask.description,
        status: optimisticTask.status,
        priority: optimisticTask.priority,
        dueDate: optimisticTask.dueDate,
        projectId: activeProjectId,
      });

      // Swap out the optimistic task with the real task from backend database
      setLocalTasks(prev => prev.map(t => t.id === optimisticId ? savedTask : t));
    } catch (err: any) {
      // Rollback on failure
      setLocalTasks(prev => prev.filter(t => t.id !== optimisticId));
      alert(`Failed to save task: ${err.message}. State rolled back.`);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canMoveTask) return;
    const { active, over } = event;
    if (!over) return;
    const activeTask = localTasks.find(t => t.id === active.id);
    if (!activeTask) return;
    const overId = String(over.id);
    const overTask = tasks.find((task) => task.id === overId);
    const overStatus = String(over.data.current?.status);
    const nextStatus: TaskStatus | null = isTaskStatus(overId)
      ? overId
      : overTask?.status ?? (isTaskStatus(overStatus) ? overStatus : null);

    if (nextStatus && activeTask.status !== nextStatus) {
      void updateTask(activeId, { status: nextStatus });
    }
  }

  async function handleCreateTask() {
    if (!title.trim() || !pid) return;

    await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      projectId: pid
    });

    // Only clear the title and description, preserve status, priority, and due date
    setTitle('');
    setDescription('');
    // Keep status, priority, and dueDate for next task creation
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-800 p-8 text-white shadow-xl sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to={`/${workspaceSlug}/projects`} className="text-sm uppercase tracking-widest text-cyan-200 hover:text-white transition">
              ← Back to Projects
            </Link>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Project Tasks</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200">
              Manage tasks for this project across the delivery pipeline.
            </p>
          </div>
          {canEditTasks && (
            <button
              type="button"
              onClick={() => setShowForm(current => !current)}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-100"
            >
              {showForm ? 'Close Form' : 'New Task'}
            </button>
          )}
        </div>

        {showForm && canEditTasks ? (
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Create Task</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Title
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Task title..."
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Status
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as TaskStatus)}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Description
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Task details..."
                  rows={3}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Priority
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as TaskPriority)}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                >
                  <option value="P0">P0 (Critical)</option>
                  <option value="P1">P1 (High)</option>
                  <option value="P2">P2 (Normal)</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Due Date
                <DatePicker date={dueDate} setDate={setDueDate} placeholder="Select a due date" disablePastDates={true} />
              </label>
              <div className="flex items-end gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={() => void handleCreateTask()}
                  disabled={!title.trim()}
                  className="rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Loading tasks...
          </div>
        ) : (
          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex-1 flex gap-5 overflow-x-auto pb-2 select-none items-stretch min-h-0 premium-scrollbar">
              {config.columns?.map(col => (
                <KanbanColumn
                  key={col.id}
                  title={col.title}
                  status={col.id}
                  tasks={filteredTasks.filter(t => t.status === col.id)}
                  onTaskClick={setSelectedTask}
                  onAddTask={colId => { setQuickTaskCol(colId); setShowTaskForm(true); }}
                  onRenameColumn={handleRenameColumn}
                  onDeleteColumn={handleDeleteColumn}
                  onMoveColumn={handleMoveColumn}
                />
              ))}

              {/* Dynamic board column addition */}
              {canManageBoard && (
                <div className="min-w-[280px] bg-white/40 dark:bg-slate-900/5 border border-dashed border-slate-205 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-start h-[130px] flex-shrink-0 animate-in fade-in duration-100">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">➕ Add Column</span>
                  <input
                    type="text"
                    placeholder="Press Enter to create..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val.trim()) {
                          const nextId = val.trim().toUpperCase().replace(/\s+/g, '_');
                          updateProjectConfig(prev => ({ ...prev, columns: [...prev.columns, { id: nextId, title: val.trim() }] }));
                          logActivity(`added column "${val.trim()}"`);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-850 dark:text-slate-200 outline-none focus:border-indigo-500 transition shadow-inner"
                  />
                  <p className="text-[9px] text-slate-450 italic mt-2.5">Creates a new board pipeline lane.</p>
                </div>
              )}
            </div>
          </DndContext>
        )}

        {/* TAB 2: SPRINTS */}
        {activeTab === 'sprints' && config && (
          <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-205 dark:border-slate-900 pb-3 flex-wrap gap-3">
              <div className="text-left">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Sprint Planning Suite</h2>
                <p className="text-xs text-slate-500 mt-1">Structure release cycles by dividing deliverables into Sprint periods and Product Backlog logs.</p>
              </div>
              {canCreateSprint && (
                <button type="button" onClick={() => setShowSprintForm(!showSprintForm)} className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 text-white rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm">
                  {showSprintForm ? 'Cancel' : '🏃 Start New Sprint'}
                </button>
              )}
            </div>

            {showSprintForm && (
              <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 shadow-lg space-y-4 max-w-sm animate-in slide-in-from-top-2 duration-150 text-left text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Configure Sprint</h3>
                <label className="block font-bold text-slate-500">Sprint Name
                  <input type="text" placeholder="e.g. Sprint 1" value={sprintName} onChange={e => setSprintName(e.target.value)} className="w-full mt-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition" />
                </label>
                <label className="block font-bold text-slate-500">Sprint Goal
                  <input type="text" placeholder="Redis connections and presence flows..." value={sprintGoal} onChange={e => setSprintGoal(e.target.value)} className="w-full mt-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition" />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowSprintForm(false)} className="rounded-lg border px-3 py-1.5">Cancel</button>
                  <button type="button" onClick={handleCreateSprint} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-1.5 font-bold transition">Launch</button>
                </div>
              </section>
            )}

            {/* Sprints panels list */}
            <div className="space-y-5">
              {config.sprints?.map(s => (
                <div key={s.id} className="border border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm hover:shadow transition duration-150">
                  <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-205 dark:border-slate-900 flex justify-between items-center text-xs flex-wrap gap-3">
                    <div className="text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</span>
                        <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-lg border ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-450 dark:border-emerald-900' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{s.status}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Goal: {s.goal || 'No goal stated'}</p>
                    </div>
                    <div className="flex gap-2">
                      {s.status === 'upcoming' && canManageBoard && (
                        <button type="button" onClick={() => handleActivateSprint(s.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 font-bold transition text-[10px]">⚡ Activate Sprint</button>
                      )}
                      {s.status === 'active' && canManageBoard && (
                        <button type="button" onClick={() => handleCompleteSprint(s.id)} className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 rounded-lg px-3 py-1.5 font-bold transition text-[10px]">Complete Sprint</button>
                      )}
                    </div>
                  </div>

                  {/* Sprints Tasks */}
                  <div className="p-4 divide-y text-xs divide-slate-100 dark:divide-slate-900 text-left">
                    {localTasks.filter(t => s.taskIds?.includes(t.id)).length === 0 ? <p className="text-slate-400 italic text-center py-4">No tasks assigned to this sprint.</p> :
                      localTasks.filter(t => s.taskIds?.includes(t.id)).map(task => (
                        <div key={task.id} className="flex justify-between items-center py-2">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{task.title}</span>
                          <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-850 text-slate-550 dark:text-slate-455 rounded px-1.5 uppercase tracking-wider">{task.status}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}

              {/* General Project Backlog block */}
              <div className="border border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md rounded-2xl p-5 text-left shadow-sm">
                <h4 className="text-xs font-bold border-b border-slate-100 dark:border-slate-900 pb-2 mb-3 text-slate-900 dark:text-white uppercase tracking-wider">📦 Product Backlog</h4>
                <div className="space-y-2">
                  {backlogTasks.length === 0 ? <p className="text-xs text-slate-450 italic py-6 text-center">Backlog is fully resolved.</p> :
                    backlogTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-900 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-xs gap-4">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Created on {new Date(task.createdAt).toLocaleDateString()}</p>
                        </div>
                        {config.sprints?.length > 0 && (
                          <select onChange={e => {
                            const sid = e.target.value;
                            if (sid) {
                              updateProjectConfig(prev => ({
                                ...prev,
                                sprints: (prev.sprints || []).map(s => s.id === sid ? { ...s, taskIds: [...(s.taskIds || []), task.id] } : s)
                              }));
                              logActivity(`moved "${task.title}" to sprint`);
                            }
                          }} className="bg-slate-50 dark:bg-slate-900 text-[10px] rounded border border-slate-200 px-2 py-1 outline-none text-slate-650 dark:text-slate-400 cursor-pointer">
                            <option value="">Move to Sprint...</option>
                            {config.sprints?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS */}
        {activeTab === 'analytics' && config && (
          <div className="space-y-6 max-w-5xl text-xs font-semibold animate-in fade-in duration-200 text-left">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Project Analytics</h2>
              <p className="text-xs text-slate-500 mt-1">Live performance burndowns and prioritization metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Burndown chart */}
              <div className="border border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md p-5 rounded-3xl shadow-sm">
                <h4 className="text-slate-400 uppercase font-bold text-[9px] tracking-wider mb-4">Sprint Burndown Rate</h4>
                <div className="w-full flex items-center justify-center py-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-2xl">
                  <svg width="280" height="130" viewBox="0 0 280 130">
                    <line x1="30" y1="20" x2="260" y2="20" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="30" y1="70" x2="260" y2="70" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="30" y1="110" x2="260" y2="110" stroke="#94A3B8" strokeWidth="1.5" />
                    <line x1="30" y1="20" x2="30" y2="110" stroke="#94A3B8" strokeWidth="1.5" />
                    <line x1="30" y1="20" x2="260" y2="110" stroke="#4F46E5" strokeWidth="1.5" strokeDasharray="4,4" />
                    <polyline fill="none" stroke="#10B981" strokeWidth="3" points="30,20 80,45 150,75 200,90 260,110" />
                    <circle cx="260" cy="110" r="3" fill="#10B981" />
                  </svg>
                </div>
                <div className="flex justify-center gap-4 text-[10px] mt-3">
                  <span className="flex items-center gap-1.5 font-bold text-indigo-650"><span className="w-2 h-0.5 bg-indigo-600 inline-block border-dashed"></span>Ideal Rate</span>
                  <span className="flex items-center gap-1.5 font-bold text-emerald-650"><span className="w-2.5 h-0.5 bg-emerald-500 inline-block"></span>Actual burn</span>
                </div>
              </div>

              {/* Priority distribution */}
              <div className="border border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-955/70 backdrop-blur-md p-5 rounded-3xl shadow-sm flex flex-col justify-between">
                <h4 className="text-slate-400 uppercase font-bold text-[9px] tracking-wider mb-2">Priority distribution</h4>
                <div className="flex items-center justify-around py-4 flex-wrap gap-4">
                  <div className="w-20 h-20 rounded-full border-4 border-slate-250 border-t-rose-500 border-r-amber-500 border-l-emerald-500 flex items-center justify-center font-bold text-xs text-slate-500">P0-P2</div>
                  <div className="space-y-1.5 text-xs text-slate-650 dark:text-slate-405 font-bold">
                    <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span>Critical (P0)</p>
                    <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>High (P1)</p>
                    <p className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>Normal (P2)</p>
                  </div>
                </div>
              </div>

              {/* Workload allocated capacity bars */}
              <div className="border border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md p-5 rounded-3xl shadow-sm md:col-span-2">
                <h4 className="text-slate-400 uppercase font-bold text-[9px] tracking-wider mb-4">Workspace workload capacity</h4>
                <div className="space-y-4">
                  {config.members?.map((m, idx) => {
                    const u = workspaceMembers.find(w => w.userId === m.userId)?.user;
                    const percent = idx === 0 ? 75 : idx === 1 ? 55 : 30;
                    return (
                      <div key={m.userId} className="space-y-1">
                        <div className="flex justify-between font-bold text-xs">
                          <span className="text-slate-700 dark:text-slate-350">{u?.name || m.role} ({m.role})</span>
                          <span className="text-indigo-650 dark:text-indigo-400">{percent}% capacity</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT FEED */}
        {activeTab === 'activity' && config && (
          <div className="space-y-5 max-w-2xl text-xs font-semibold animate-in fade-in duration-200 text-left">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Audit Log Feed</h2>
              <p className="text-xs text-slate-500 mt-1">Audit log records representing project-level activities and modifications.</p>
            </div>

            <div className="border-l-2 border-slate-200 dark:border-slate-800 pl-4 ml-2 space-y-4 pt-1">
              {config.activities?.length === 0 ? <p className="text-slate-450 italic">No events logged yet.</p> :
                config.activities?.map(act => (
                  <div key={act.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-indigo-600 border border-white dark:border-slate-950 shadow-sm"></span>
                    <p className="text-slate-705 dark:text-slate-300 font-bold">{act.userName} <span className="font-normal text-slate-500">{act.details}</span></p>
                    <span className="text-[9px] text-slate-500 mt-0.5 block flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(act.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* TAB 5: AI SUGGESTIONS */}
        {activeTab === 'ai' && config && (
          <div className="space-y-5 max-w-4xl text-xs font-semibold animate-in fade-in duration-200 text-left">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Deliverable Copilot</h2>
              <p className="text-xs text-slate-500 mt-1">Let DevCollab AI break down your feature goals into clear Kanban board deliverables.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Prompt box */}
              <div className="border border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md p-5 rounded-3xl shadow-sm space-y-4">
                <h4 className="text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1"><Bot className="h-4.5 w-4.5 text-indigo-500" /> AI Prompter</h4>
                <textarea placeholder="e.g. Design socket connections room adapters fallback decks..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 rounded-2xl p-3 resize-none outline-none focus:border-indigo-500 transition text-slate-800 dark:text-slate-100" rows={4} />

                <button type="button" onClick={handleGenerateAISuggestions} disabled={aiLoading || !aiPrompt.trim()} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-2.5 font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
                  {aiLoading ? 'Thinking...' : '⚡ Compile suggestions'}
                </button>
              </div>

              {/* Suggestions result */}
              <div className="border border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md p-5 rounded-3xl shadow-sm md:col-span-2 space-y-4">
                <h4 className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">AI suggested subtasks</h4>
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 premium-scrollbar">
                  {aiLoading ? (
                    <div className="text-center py-16 text-slate-500 animate-pulse flex flex-col items-center justify-center gap-2">
                      <span>⚡ Contacting AI model...</span>
                    </div>
                  ) : aiSuggestions.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 italic">
                      Type a project goal or click "Compile suggestions" to let AI work.
                    </div>
                  ) : (
                    aiSuggestions.map((sug, i) => (
                      <div key={i} className="p-3.5 border border-slate-100 dark:border-slate-900 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center text-xs gap-3 hover:border-indigo-500/20 transition animate-in slide-in-from-bottom-2 duration-150">
                        <div className="text-left min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-955 text-[9px] font-bold px-2 py-0.5 rounded">{sug.priority}</span>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{sug.title}</h4>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{sug.description}</p>
                        </div>
                        {canCreateTask && (
                          <button type="button" onClick={() => void handleAddAISuggestionToBoard(sug)} className="bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 text-indigo-750 dark:text-indigo-400 rounded-lg px-2.5 py-1.5 font-bold text-[10px] flex-shrink-0">➕ Add</button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ─── UPGRADE TO PRO UPGRADE MODAL ───────────────────────────────────────── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-white text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center">
              <span className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-650 flex items-center justify-center text-xl shadow-lg animate-bounce">
                <Crown className="h-6 w-6 text-amber-300" />
              </span>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight">Upgrade to DevCollab Pro</h2>
              <p className="text-xs text-slate-400 leading-normal">You've reached the limit of 5 projects for Free workspaces. Upgrade to unlock unlimited projects!</p>
            </div>
            <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/30 text-left text-xs space-y-2 text-slate-355">
              <p className="flex items-center gap-2">✓ <span className="font-semibold text-white">Unlimited Project Workspaces</span></p>
              <p className="flex items-center gap-2">✓ <span className="font-semibold text-white">Advanced Sprint Planner & Backlog</span></p>
              <p className="flex items-center gap-2">✓ <span className="font-semibold text-white">Burndown Analytics Charts</span></p>
              <p className="flex items-center gap-2">✓ <span className="font-semibold text-white">AI Subtasks suggest Copilot</span></p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpgradeModal(false)} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-bold hover:bg-slate-800 transition">Maybe later</button>
              <button type="button" onClick={handleProUpgradeSubmit} className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 py-2.5 text-xs font-extrabold shadow-lg transition hover:opacity-95">Upgrade to Pro</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE PROJECT ONBOARDING MODAL ────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button type="button" onClick={() => { setShowCreateModal(false); setWizardStep(1); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">✕</button>

            <div className="mb-4 text-left border-b border-slate-800 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Step {wizardStep} of 5</span>
              <h2 className="text-base font-bold text-white mt-0.5">Create Project Workspace</h2>
            </div>

            {/* Stepper Progress bar */}
            <div className="w-full h-1 bg-slate-850 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${(wizardStep / 5) * 100}%` }}></div>
            </div>

            <div className="min-h-[280px]">
              {renderWizardContent()}
            </div>

            {/* Stepper Navigation inside modal */}
            <div className="flex justify-between items-center mt-6 border-t border-slate-850 pt-4">
              <button
                type="button"
                onClick={() => setWizardStep(prev => prev - 1)}
                disabled={wizardStep === 1}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 transition"
              >
                Back
              </button>
              {wizardStep < 5 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(prev => prev + 1)}
                  disabled={
                    (wizardStep === 1 && !onboardingAnswers.buildType) ||
                    (wizardStep === 2 && !onboardingAnswers.teamSize) ||
                    (wizardStep === 3 && !onboardingAnswers.priority) ||
                    (wizardStep === 4 && !onboardingAnswers.workflow)
                  }
                  className="rounded-xl bg-indigo-650 px-5 py-2 text-xs font-bold hover:bg-indigo-550 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleLaunchProject()}
                  disabled={!onboardingAnswers.style}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-extrabold hover:bg-indigo-550 transition shadow-lg"
                >
                  🚀 Compile Workspace
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task detail modal drawer */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={async updates => {
            const res = await updateTask(selectedTask.id, { ...updates, dueDate: updates.dueDate === null ? undefined : updates.dueDate });
            logActivity(`updated task: "${res.title}"`);
            return res;
          }}
          onDelete={async id => {
            await deleteTask(id);
            logActivity(`deleted task`);
          }}
          onAddComment={async (id, content) => {
            const res = await addComment(id, content);
            logActivity(`commented on task`);
            return res;
          }}
        />
      )}

    </div>
  );
}
