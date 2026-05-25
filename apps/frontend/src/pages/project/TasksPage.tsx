import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { useTaskStore } from '../../stores/taskStore';
import { useProjectStore } from '../../stores/projectStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';

import { useSnippetStore } from '../../stores/snippetStore';
import KanbanColumn from '../../components/kanban/KanbanColumn';
import TaskModal from '../../components/kanban/TaskModal';
import { DatePicker } from '../../components/ui/DatePicker';
import { Task, TaskStatus, TaskPriority } from '../../types';
import {
  Search, Plus, Clock, Bot, Calendar,
  TrendingUp, ChevronRight, CheckCircle2, Layers,
  Code, Copy
} from 'lucide-react';


interface ProjectWorkspaceConfig {
  name: string;
  description: string;
  projectType: string;
  primaryGoal?: string;
  workspaceStyle?: string;
  columns: { id: string; title: string }[];
  activities: { id: string; userName: string; details: string; timestamp: string }[];
  ownerId?: string;
  projectRoles?: Record<string, string>;
  rolePermissions?: Record<string, Record<string, boolean>>;
  archived?: boolean;
}

export default function TasksPage(): React.ReactElement {
  const { workspaceId, projectId: pid } = useParams<{ workspaceId: string; projectId: string }>();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const tabParam = queryParams.get('tab');

  const { tasks, loading, error, fetchTasksByProject, createTask, updateTask, deleteTask, addComment } = useTaskStore();
  const { projects } = useProjectStore();
  const { members } = useWorkspaceStore();
  const { user } = useAuthStore();


  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'activity' | 'ai' | 'snippets'>('dashboard');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Snippets store and state
  const { snippets, fetchSnippetsByProject } = useSnippetStore();
  const [snippetSearchQuery, setSnippetSearchQuery] = useState('');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam && ['dashboard', 'board', 'activity', 'ai', 'snippets'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  useEffect(() => {
    if (pid && activeTab === 'snippets') {
      void fetchSnippetsByProject(pid);
    }
  }, [pid, activeTab, fetchSnippetsByProject]);




  // Create Task Form States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPrio, setTaskPrio] = useState<TaskPriority>('P2');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('TODO');
  const [taskDue, setTaskDue] = useState<Date | undefined>();
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  // AI assistant states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<{ title: string; description: string; priority: TaskPriority }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Optimistic/Local tasks tracking
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [config, setConfig] = useState<ProjectWorkspaceConfig | null>(null);

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === pid);
  }, [projects, pid]);

  const getMemberRole = (userId: string): string => {
    if (config?.ownerId === userId || activeProject?.createdBy?.id === userId) {
      return 'Owner';
    }
    if (config?.projectRoles && config.projectRoles[userId]) {
      return config.projectRoles[userId];
    }
    const wsMember = members.find(m => m.userId === userId);
    if (wsMember) {
      if (wsMember.role === 'OWNER') return 'Owner';
      if (wsMember.role === 'ADMIN') return 'Admin';
      if (wsMember.role === 'VIEWER') return 'Viewer';
    }
    return 'Developer';
  };

  const hasPermission = (userId: string, permissionKey: string): boolean => {
    const role = getMemberRole(userId);
    if (role === 'Owner') return true;

    if (config?.rolePermissions && config.rolePermissions[role]) {
      if (config.rolePermissions[role][permissionKey] !== undefined) {
        return !!config.rolePermissions[role][permissionKey];
      }
    }

    const defaultPermissions: Record<string, Record<string, boolean>> = {
      Admin: {
        create_task: true, edit_task: true, delete_task: true, move_task: true,
        manage_members: true, edit_project_settings: true, access_ai: true,
        manage_audit_feed: true, invite_users: true
      },
      'Project Manager': {
        create_task: true, edit_task: true, delete_task: true, move_task: true,
        manage_members: false, edit_project_settings: true, access_ai: true,
        manage_audit_feed: true, invite_users: true
      },
      Developer: {
        create_task: true, edit_task: true, delete_task: false, move_task: true,
        manage_members: false, edit_project_settings: false, access_ai: true,
        manage_audit_feed: false, invite_users: false
      },
      Viewer: {
        create_task: false, edit_task: false, delete_task: false, move_task: false,
        manage_members: false, edit_project_settings: false, access_ai: false,
        manage_audit_feed: false, invite_users: false
      }
    };

    return !!defaultPermissions[role]?.[permissionKey];
  };

  const canCreateTask = user && !config?.archived ? hasPermission(user.id, 'create_task') : false;
  const canMoveTask = user && !config?.archived ? hasPermission(user.id, 'move_task') : false;
  const canAccessAI = user ? hasPermission(user.id, 'access_ai') : false;
  const canManageAuditFeed = user ? hasPermission(user.id, 'manage_audit_feed') : false;

  // Load and cache workspace configurations
  const loadConfig = () => {
    if (workspaceId && pid) {
      const stored = localStorage.getItem(`devcollab_project_workspace_${pid}`);
      if (stored) {
        try {
          setConfig(JSON.parse(stored));
        } catch {
          setConfig(null);
        }
      } else {
        // Fallback default config if none exists
        const fallback: ProjectWorkspaceConfig = {
          name: activeProject?.name || 'Project Workspace',
          description: activeProject?.description || 'Active delivery stream',
          projectType: 'Internal Product',
          primaryGoal: 'Workflow Organization',
          workspaceStyle: 'Minimal',
          columns: [
            { id: 'TODO', title: 'To Do' },
            { id: 'IN_PROGRESS', title: 'In Progress' },
            { id: 'IN_REVIEW', title: 'In Review' },
            { id: 'DONE', title: 'Completed' }
          ],
          activities: [
            { id: `act-${Date.now()}`, userName: 'Workspace Member', details: 'created this project workspace', timestamp: new Date().toISOString() }
          ],
          ownerId: user?.id || activeProject?.createdBy?.id || 'owner',
          projectRoles: {},
          rolePermissions: {}
        };
        setConfig(fallback);
        localStorage.setItem(`devcollab_project_workspace_${pid}`, JSON.stringify(fallback));
      }
    }
  };


  useEffect(() => {
    if (pid) {
      void fetchTasksByProject(pid);
      loadConfig();
    }
  }, [pid, fetchTasksByProject]);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);


  const updateProjectConfig = (updater: (prev: ProjectWorkspaceConfig) => ProjectWorkspaceConfig) => {
    if (!config || !pid) return;
    const next = updater(config);
    localStorage.setItem(`devcollab_project_workspace_${pid}`, JSON.stringify(next));
    setConfig(next);
  };

  const logActivity = (details: string) => {
    updateProjectConfig(prev => ({
      ...prev,
      activities: [
        {
          id: `act-${Date.now()}`,
          userName: user?.name || 'Workspace Member',
          details,
          timestamp: new Date().toISOString()
        },
        ...(prev.activities || [])
      ]
    }));
  };




  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      setTitleError("Task title is required");
      return;
    }
    if (!pid) {
      alert("Project ID is missing. Please reload the page.");
      return;
    }

    setIsCreatingTask(true);
    setTitleError(null);

    const tempId = `temp-${Date.now()}`;
    const tempTask: Task = {
      id: tempId,
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
      status: taskStatus,
      priority: taskPrio,
      dueDate: taskDue ? taskDue.toISOString() : undefined,
      projectId: pid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: {
        id: user?.id || 'owner',
        email: user?.email || 'owner@devcollab.com',
        name: user?.name || 'Workspace Member'
      },
      comments: []
    };

    // Pre-insert optimistically so it instantly appears in the board lane
    setLocalTasks(prev => [tempTask, ...prev]);

    try {
      const added = await createTask({
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        status: taskStatus,
        priority: taskPrio,
        dueDate: taskDue ? taskDue.toISOString() : undefined,
        projectId: pid
      });

      // Replace the optimistic temp task with the actual added task
      setLocalTasks(prev => prev.map(t => t.id === tempId ? added : t));
      logActivity(`created task: "${taskTitle.trim()}"`);

      // Reset form and close modal smoothly
      setTaskTitle('');
      setTaskDesc('');
      setTaskDue(undefined);
      setShowTaskForm(false);
    } catch (err: any) {
      // Revert optimistic task on error
      setLocalTasks(prev => prev.filter(t => t.id !== tempId));
      alert(`Failed to create task: ${err.message || err}`);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canMoveTask) {
      alert("You do not have permission to move tasks in this project workspace.");
      return;
    }
    const { active, over } = event;
    if (!over) return;

    const activeTask = localTasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = String(over.id);
    const nextStatus = (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(overId) ? overId : 'TODO') as TaskStatus;

    if (activeTask.status !== nextStatus) {
      setLocalTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: nextStatus } : t));
      logActivity(`moved task "${activeTask.title}" to ${nextStatus.replace('_', ' ')}`);

      void updateTask(activeTask.id, { status: nextStatus }).catch(() => {
        setLocalTasks(tasks);
        alert("Failed to synchronize board placement. Reverting status.");
      });
    }
  };

  // AI assistant handlers
  const handleGenerateAISuggestions = () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiSummary(null);

    setTimeout(() => {
      setAiSuggestions([
        { title: `Initialize data validation adapters for ${aiPrompt.trim()}`, description: `Design validation schemas and context filters.`, priority: 'P1' },
        { title: `Refactor responsive view constraints for ${aiPrompt.trim()}`, description: `Benchmark flex boxes on tablet and mobile viewports.`, priority: 'P2' },
        { title: `Setup robust error exception capture models for ${aiPrompt.trim()}`, description: `Hook global catches and Sentry-grade monitors.`, priority: 'P0' }
      ]);
      setAiLoading(false);
    }, 700);
  };

  const handleAISummarizeProgress = () => {
    setAiLoading(true);
    setAiSuggestions([]);

    setTimeout(() => {
      const completed = localTasks.filter(t => t.status === 'DONE').length;
      const total = localTasks.length;
      const progress = total ? Math.round((completed / total) * 100) : 0;
      setAiSummary(`📊 DevCollab AI Project Status Report:\n\nThis stream is currently resolving **${progress}%** of all tracked milestones (${completed}/${total} completed tasks). The delivery index is stable. To accelerate velocity, consider breaking down pending high priority deliverables in the In Progress column.`);
      setAiLoading(false);
    }, 600);
  };

  const handleAddAISugToBoard = async (sug: typeof aiSuggestions[number]) => {
    if (!pid) return;
    try {
      const added = await createTask({
        title: sug.title,
        description: sug.description,
        status: 'TODO',
        priority: sug.priority,
        projectId: pid
      });
      setLocalTasks(prev => [added, ...prev]);
      logActivity(`created task from AI suggestion: "${sug.title}"`);
      alert(`Added "${sug.title}" to Kanban Todo lane!`);
    } catch (err: any) {
      alert(`Failed to add task: ${err.message}`);
    }
  };

  // Stats
  const completedCount = useMemo(() => localTasks.filter(t => t.status === 'DONE').length, [localTasks]);
  const totalCount = useMemo(() => localTasks.length, [localTasks]);
  const percentComplete = useMemo(() => totalCount ? Math.round((completedCount / totalCount) * 100) : 0, [completedCount, totalCount]);

  const upcomingDeadlines = useMemo(() => {
    return localTasks
      .filter(t => t.dueDate && t.status !== 'DONE')
      .map(t => ({ ...t, parsedDate: new Date(t.dueDate!) }))
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
      .slice(0, 3);
  }, [localTasks]);

  const filteredKanbanTasks = useMemo(() => {
    if (!searchQuery.trim()) return localTasks;
    return localTasks.filter(t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [localTasks, searchQuery]);

  return (
    <div className="min-h-screen bg-[#121316] text-slate-200 font-sans antialiased premium-scrollbar selection:bg-indigo-500/30 selection:text-white">
      {/* Visual Depth Injectors */}
      <style>{`
        .glass-panel {
          background: #17191d;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .board-lane {
          background: #17191d;
        }
        .board-lane-sticky {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #17191d;
        }
        .tab-pill-active {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }
        .smooth-lift {
          transition: all 0.15s ease-out;
        }
      `}</style>      {/* Top Navbar details */}
      <div className="border-b border-white/[0.04] bg-[#17191d]/85 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white leading-none">{activeProject?.name || 'Your project name'}</h1>
              <span className="text-[8px] uppercase font-mono tracking-widest px-1.5 py-0.5 border border-white/[0.04] rounded bg-white/[0.02] text-slate-500">
                {config?.workspaceStyle || 'Minimal'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-none font-medium">Deliverables stream control center</p>
          </div>
        </div>

        {/* Minimal Tab Selection Navigation */}
        <div className="flex items-center gap-1 bg-black/20 border border-white/[0.04] rounded-lg p-0.5 max-w-md self-start sm:self-center">
          {[
            { id: 'dashboard', label: 'Overview', icon: <TrendingUp className="h-3.5 w-3.5" /> },
            { id: 'board', label: 'Board', icon: <Layers className="h-3.5 w-3.5" /> },
            ...(canManageAuditFeed ? [{ id: 'activity', label: 'Audits', icon: <Clock className="h-3.5 w-3.5" /> }] : []),
            ...(canAccessAI ? [{ id: 'ai', label: 'AI Copilot', icon: <Bot className="h-3.5 w-3.5" /> }] : []),
            { id: 'snippets', label: 'Snippets', icon: <Code className="h-3.5 w-3.5" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold border border-transparent transition-all ${activeTab === tab.id
                  ? 'tab-pill-active font-black'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Error notification banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-950 bg-rose-950/20 px-4 py-2.5 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* ─── TAB 1: OVERVIEW DASHBOARD ───────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
            {/* Left Column: Progress circle & Recent Milestones */}
            <div className="lg:col-span-2 space-y-6">
              {/* Workspace Progress Card */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="space-y-2 text-left">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 leading-none">Workspace Progress</span>
                  <h2 className="text-xl font-bold text-white">Project Stream Health</h2>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md font-medium">
                    {activeProject?.description || config?.description || 'Your delivery streams are configuring workspace lanes to coordinate project milestones.'}
                  </p>
                </div>
                {/* Compact Circular progress */}
                <div className="relative flex-shrink-0 w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="38" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="5.5" fill="transparent" />
                    <circle cx="48" cy="48" r="38" stroke="url(#indigoGrad)" strokeWidth="5.5" fill="transparent" strokeDasharray="238.7" strokeDashoffset={238.7 - (238.7 * percentComplete) / 100} className="transition-all duration-300" />
                    <defs>
                      <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-lg font-extrabold text-white">{percentComplete}%</span>
                    <span className="text-[7px] uppercase tracking-widest text-slate-500 font-bold leading-none mt-0.5">Complete</span>
                  </div>
                </div>
              </div>

              {/* Recent Tasks Panel */}
              <div className="glass-panel rounded-2xl p-6 space-y-4 text-left">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Recent Milestones</h3>
                <div className="divide-y divide-white/[0.03]">
                  {localTasks.length === 0 ? (
                    <div className="text-center py-8 space-y-2.5">
                      <p className="text-xs text-slate-500 italic">No milestones built yet.</p>
                      <button type="button" onClick={() => { setTaskStatus('TODO'); setShowTaskForm(true); }} className="px-3 py-1.5 border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] text-indigo-400 font-bold rounded-lg text-[10px] transition">
                        + Create Task
                      </button>
                    </div>
                  ) : (
                    localTasks.slice(0, 4).map(task => (
                      <div key={task.id} className="flex justify-between items-center py-3 hover:bg-white/[0.01] px-2 rounded-xl transition cursor-pointer" onClick={() => setSelectedTask(task)}>
                        <div className="min-w-0 flex items-center gap-2.5">
                          <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${task.status === 'DONE' ? 'text-emerald-500' : 'text-slate-500'}`} />
                          <span className="text-xs font-bold text-slate-200 truncate">{task.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 border rounded ${task.priority === 'P0'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : task.priority === 'P1'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}>
                            {task.priority}
                          </span>
                          <span className="text-[8px] uppercase font-mono px-1.5 py-0.5 border border-white/[0.04] bg-slate-950 rounded text-slate-500">
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Deadlines, Team, Quick Commands */}
            <div className="space-y-6 text-left">
              {/* Quick actions grid */}
              <div className="glass-panel rounded-2xl p-5 space-y-3.5">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">Commands</h3>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <button type="button" onClick={() => { setTaskStatus('TODO'); setShowTaskForm(true); }} className="p-2.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 text-indigo-300 font-bold rounded-xl transition">
                    + New Task
                  </button>
                  <button type="button" onClick={() => setActiveTab('board')} className="p-2.5 bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 text-cyan-300 font-bold rounded-xl transition">
                    Open Board
                  </button>
                </div>
              </div>

              {/* Deadlines Widget */}
              <div className="glass-panel rounded-2xl p-5 space-y-3">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Upcoming Deadlines</h3>
                <div className="space-y-2">
                  {upcomingDeadlines.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-2 text-center">No upcoming deadlines.</p>
                  ) : (
                    upcomingDeadlines.map(task => (
                      <div key={task.id} className="flex justify-between items-center text-xs p-2 border border-white/[0.04] rounded-lg bg-black/10" onClick={() => setSelectedTask(task)}>
                        <span className="font-bold text-slate-300 truncate max-w-[60%]">{task.title}</span>
                        <span className="flex items-center gap-1 text-[9px] text-amber-400 font-extrabold">
                          <Calendar className="h-3 w-3" />
                          {task.parsedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Team Members Widget */}
              <div className="glass-panel rounded-2xl p-5 space-y-3">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Stream Members</h3>
                <div className="space-y-2.5">
                  {members.slice(0, 3).map(m => (
                    <div key={m.userId} className="flex items-center justify-between text-xs py-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5.5 h-5.5 rounded-full bg-indigo-650 flex items-center justify-center font-bold text-[8px] text-white">
                          {(m.user?.name || m.user?.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-300 truncate max-w-[120px]">{m.user?.name || m.user?.email}</span>
                      </div>
                      <span className="text-[8px] uppercase font-mono px-1.5 py-0.5 border border-white/[0.04] rounded text-slate-500">{m.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: REDESIGNED KANBAN BOARD ──────────────────────────────────── */}
        {activeTab === 'board' && (
          <div className="space-y-6 animate-in fade-in duration-150 text-left">
            {/* Header board actions */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 bg-white/[0.01] border border-white/[0.04] rounded-xl px-4 py-2 w-full max-w-xs focus-within:border-indigo-500/30 transition">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs w-full outline-none placeholder-slate-500 text-slate-200"
                />
              </div>

              {canCreateTask && (
                <button
                  type="button"
                  onClick={() => { setTaskStatus('TODO'); setShowTaskForm(true); }}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Task
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-24 text-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                <div className="flex gap-6 overflow-x-auto pb-4 select-none items-start min-h-[480px] premium-scrollbar">
                  {config?.columns?.map(col => {
                    const colTasks = filteredKanbanTasks.filter(t => t.status === col.id);
                    return (
                      <KanbanColumn
                        key={col.id}
                        title={col.title}
                        status={col.id}
                        tasks={colTasks}
                        onTaskClick={setSelectedTask}
                        onAddTask={canCreateTask ? (colId) => { setTaskStatus(colId as TaskStatus); setShowTaskForm(true); } : undefined}
                      />
                    );
                  })}
                </div>
              </DndContext>
            )}
          </div>
        )}

        {/* ─── TAB 3: TIMELINE AUDIT FEED ──────────────────────────────────────── */}
        {activeTab === 'activity' && canManageAuditFeed && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-150">
            <div className="text-left space-y-1 pb-4 border-b border-white/[0.04]">
              <h2 className="text-base font-bold text-white">Timeline Audit Logs</h2>
              <p className="text-[10px] text-slate-500 leading-none">Chronological pipeline logs tracking workspace updates.</p>
            </div>

            <div className="relative border-l border-white/[0.04] pl-6 ml-4 space-y-6 py-2 text-left">
              {config?.activities?.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic py-4">No logged entries.</p>
              ) : (
                config?.activities?.map(act => (
                  <div key={act.id} className="relative group">
                    <span className="absolute -left-[29px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#08090a] border border-indigo-500/40 shadow-sm flex items-center justify-center">
                      <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-300 font-bold leading-normal">
                        <span className="text-indigo-400 font-black">{act.userName}</span> {act.details}
                      </p>
                      <span className="text-[9px] text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(act.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 4: AI COPIOT ASSISTANT ──────────────────────────────────────── */}
        {activeTab === 'ai' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150 text-left">
            <div className="glass-panel p-5 rounded-2xl shadow-sm space-y-4 h-fit">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-indigo-400" /> AI Copilot
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">Use structured pipelines to instantly draft milestone subtasks or synthesize delivery reports.</p>

              <div className="space-y-3.5 pt-1.5 border-t border-white/[0.04]">
                <button type="button" onClick={handleAISummarizeProgress} disabled={aiLoading} className="w-full text-left p-3 border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] rounded-xl transition text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>📊 Synthesize Stream Status</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                </button>
                <div className="space-y-2 pt-1.5">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Subtask Composer</label>
                  <textarea
                    placeholder="Describe a goal to generate structured subtasks..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full bg-slate-950 border border-white/[0.04] rounded-xl p-3 resize-none outline-none focus:border-indigo-500/50 text-xs text-slate-200 transition"
                    rows={3}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAISuggestions}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="w-full bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl py-2 text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    {aiLoading ? 'Composing...' : '⚡ Generate Subtasks'}
                  </button>
                </div>
              </div>
            </div>

            {/* Output screen */}
            <div className="glass-panel p-5 rounded-2xl shadow-sm lg:col-span-2 space-y-4 min-h-[280px] flex flex-col">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Copilot Output</h3>

              {aiLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12 gap-2 animate-pulse">
                  <Bot className="h-8 w-8 text-indigo-500 animate-bounce" />
                  <span className="text-[9px] font-extrabold uppercase tracking-widest font-mono">Synthesizing...</span>
                </div>
              ) : aiSummary ? (
                <div className="p-4 border border-indigo-500/10 rounded-xl bg-indigo-500/5 leading-relaxed text-xs text-indigo-200 whitespace-pre-line font-medium shadow-inner animate-in fade-in duration-150">
                  {aiSummary}
                </div>
              ) : aiSuggestions.length > 0 ? (
                <div className="space-y-2 flex-1 overflow-y-auto pr-1 premium-scrollbar">
                  {aiSuggestions.map((sug, i) => (
                    <div key={i} className="p-3 border border-white/[0.04] rounded-xl bg-white/[0.005] flex justify-between items-center text-xs gap-4 hover:border-slate-800 transition animate-in fade-in duration-100">
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border ${sug.priority === 'P0'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : sug.priority === 'P1'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}>
                            {sug.priority}
                          </span>
                          <h4 className="font-bold text-white truncate">{sug.title}</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-medium">{sug.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleAddAISugToBoard(sug)}
                        className="bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg px-2.5 py-1 font-bold text-[9px] flex-shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16 text-center space-y-2">
                  <Bot className="h-6 w-6 text-slate-700" />
                  <p className="text-[11px] italic text-slate-600 font-medium">Select a quick command or write a prompt to coordinate AI deliverables.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 5: DEDICATED PROJECT SNIPPETS SYSTEM ───────────────────────── */}
        {activeTab === 'snippets' && (
          <div className="space-y-6 animate-in fade-in duration-150 text-left">
            {/* Header / Search Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
              <div className="space-y-1 text-left">
                <h2 className="text-xl font-semibold text-white">Project Snippets</h2>
                <p className="text-xs text-slate-400">Reusable code blocks, configurations, and utilities specific to this project.</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-950 border border-white/[0.04] rounded-xl px-3 py-2 w-full max-w-xs focus-within:border-indigo-500/30 transition">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search snippets..."
                    value={snippetSearchQuery}
                    onChange={(e) => setSnippetSearchQuery(e.target.value)}
                    className="bg-transparent text-xs w-full outline-none placeholder-slate-500 text-slate-200"
                  />
                </div>
                <Link
                  to={`/w/${workspaceId}/p/${pid}/snippets/new`}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> New Snippet
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="py-24 text-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : snippets.length === 0 ? (
              <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.04] px-4 py-16 text-center text-xs text-slate-500 bg-white/[0.005] min-h-[220px]">
                <Code className="h-8 w-8 text-slate-700 mb-2" />
                <p className="font-bold text-slate-400 uppercase tracking-wider">No Snippets Found</p>
                <p className="text-slate-600 mt-1 max-w-xs leading-relaxed font-medium">Save reusable utility scripts, APIs, or config snippets for your development stream.</p>
                <Link
                  to={`/w/${workspaceId}/p/${pid}/snippets/new`}
                  className="mt-4 px-4.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold rounded-xl text-xs transition"
                >
                  + Add Your First Snippet
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {snippets
                  .filter(snip => 
                    snip.title.toLowerCase().includes(snippetSearchQuery.toLowerCase()) ||
                    (snip.description && snip.description.toLowerCase().includes(snippetSearchQuery.toLowerCase())) ||
                    snip.language.toLowerCase().includes(snippetSearchQuery.toLowerCase())
                  )
                  .map(snip => (
                    <Link
                      key={snip.id}
                      to={`/w/${workspaceId}/p/${pid}/snippets/${snip.id}`}
                      className="glass-panel rounded-2xl p-4 flex flex-col justify-between gap-4 border border-white/[0.04] bg-[#17191d] shadow-sm relative overflow-hidden smooth-lift hover:bg-[#1e2025] hover:border-white/[0.08]"
                    >
                      <div className="space-y-2">
                        {/* Title & Actions Row */}
                        <div className="flex items-center justify-between gap-3 text-left">
                          <h3 className="text-sm font-semibold text-white truncate pr-12">{snip.title}</h3>
                          <span className="text-[9px] uppercase font-mono tracking-widest px-1.5 py-0.5 border border-white/[0.04] rounded bg-white/[0.02] text-slate-400 flex-shrink-0">
                            {snip.language}
                          </span>
                        </div>
                        
                        {snip.description && (
                          <p className="text-[11px] text-slate-400 leading-relaxed font-medium line-clamp-2 text-left">
                            {snip.description}
                          </p>
                        )}
                        
                        {/* Monospace Code Preview */}
                        <div className="relative group/code mt-2">
                          <pre className="bg-slate-950 font-mono text-[10px] text-slate-350 rounded-xl p-3 border border-white/[0.03] overflow-x-auto max-h-[140px] premium-scrollbar">
                            <code>{snip.code}</code>
                          </pre>
                          
                          {/* Copy Button Hover Overlay */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void navigator.clipboard.writeText(snip.code);
                              setCopiedSnippetId(snip.id);
                              setTimeout(() => setCopiedSnippetId(null), 1500);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg border border-white/[0.04] bg-slate-950/80 hover:bg-slate-950 text-slate-400 hover:text-white transition shadow-lg"
                            title="Copy code snippet"
                          >
                            {copiedSnippetId === snip.id ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Footer Metadata & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.03] mt-1 text-[10px] text-slate-500">
                        <span>
                          {new Date(snip.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        
                        <span className="text-[9px] text-indigo-400 hover:text-indigo-300 font-extrabold flex items-center gap-0.5">
                          Edit <Plus className="h-3 w-3 rotate-45" />
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── CREATE TASK OVERLAY MODAL ────────────────────────────────── */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050607]/80 px-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#17191d] border border-white/[0.04] rounded-2xl p-5 text-white shadow-2xl space-y-4 text-left animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-3">
              <h2 className="text-sm font-bold text-white">Create Workspace Task</h2>
              <button type="button" onClick={() => setShowTaskForm(false)} className="text-slate-500 hover:text-white transition">✕</button>
            </div>

            <div className="grid gap-3.5">
              <div className="grid gap-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  placeholder="Your task title..."
                  value={taskTitle}
                  onChange={(e) => {
                    setTaskTitle(e.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  className={`bg-slate-950 border rounded-xl px-4 py-2.5 text-xs outline-none text-slate-200 placeholder-slate-600 transition ${
                    titleError ? 'border-rose-500/80 focus:border-rose-500' : 'border-white/[0.04] focus:border-indigo-500/50'
                  }`}
                />
                {titleError && (
                  <span className="text-[10px] text-rose-400 mt-1 font-semibold">{titleError}</span>
                )}
              </div>

              <div className="grid gap-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Lane Status</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                  className="bg-slate-950 border border-white/[0.04] rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500/50 text-slate-400 transition"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Completed</option>
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea
                  placeholder="Short task description..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                  className="bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500/50 text-slate-200 placeholder-slate-600 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="grid gap-1">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Priority</label>
                  <select
                    value={taskPrio}
                    onChange={(e) => setTaskPrio(e.target.value as TaskPriority)}
                    className="bg-slate-950 border border-white/[0.04] rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500/50 text-slate-400 transition"
                  >
                    <option value="P0">P0 (Critical)</option>
                    <option value="P1">P1 (High)</option>
                    <option value="P2">P2 (Normal)</option>
                  </select>
                </div>

                <div className="grid gap-1 text-xs">
                  <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Due Date</label>
                  <DatePicker date={taskDue} setDate={setTaskDue} placeholder="Choose deadline" disablePastDates={true} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.04]">
              <button
                type="button"
                onClick={() => {
                  setShowTaskForm(false);
                  setTitleError(null);
                }}
                disabled={isCreatingTask}
                className="rounded-xl border border-white/[0.04] px-4 py-2 text-xs font-bold hover:bg-white/[0.01] transition text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateTask()}
                disabled={isCreatingTask}
                className="rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 disabled:pointer-events-none text-white px-5 py-2 text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                {isCreatingTask ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Creating...
                  </>
                ) : (
                  'Create Task'
                )}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Task detail drawer modal */}
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

