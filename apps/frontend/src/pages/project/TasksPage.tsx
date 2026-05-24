import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Search, Plus, Clock, Bot, Calendar,
  TrendingUp, ArrowLeft, ChevronRight, CheckCircle2, Layers, Sparkles
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

  const { tasks, loading, error, fetchTasksByProject, createTask, updateTask, deleteTask, addComment } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore();
  const { members, fetchWorkspaceDetails } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { fetchSubscription } = useBillingStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'activity' | 'ai' | 'settings'>('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'members' | 'permissions' | 'billing'>('general');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Project General Settings local inputs states
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projType, setProjType] = useState('');
  const [projGoal, setProjGoal] = useState('');
  const [projStyle, setProjStyle] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

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
  const canEditSettings = user ? hasPermission(user.id, 'edit_project_settings') : false;
  const canManageMembers = user ? hasPermission(user.id, 'manage_members') : false;

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
    if (workspaceId) {
      void fetchProjects(workspaceId);
      void fetchWorkspaceDetails(workspaceId);
      void fetchSubscription(workspaceId);
    }
  }, [workspaceId, fetchProjects, fetchWorkspaceDetails, fetchSubscription]);

  useEffect(() => {
    if (pid) {
      void fetchTasksByProject(pid);
      loadConfig();
    }
  }, [pid, fetchTasksByProject]);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (config) {
      setProjName(config.name || '');
      setProjDesc(config.description || '');
      setProjType(config.projectType || 'Internal Product');
      setProjGoal(config.primaryGoal || 'Workflow Organization');
      setProjStyle(config.workspaceStyle || 'Minimal');
    }
  }, [config]);

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

  const handleSaveGeneralSettings = () => {
    if (!canEditSettings) {
      alert("You do not have permission to edit project settings.");
      return;
    }
    updateProjectConfig(prev => ({
      ...prev,
      name: projName,
      description: projDesc,
      projectType: projType,
      primaryGoal: projGoal,
      workspaceStyle: projStyle
    }));
    logActivity(`updated project general configurations`);
    alert("Project settings updated successfully!");
  };

  const handleArchiveProject = () => {
    if (!canEditSettings) {
      alert("You do not have permission to archive this project.");
      return;
    }
    if (!window.confirm("Are you sure you want to archive this project? All tasks will become read-only.")) return;
    
    updateProjectConfig(prev => ({
      ...prev,
      archived: true
    }));
    logActivity(`archived the project workspace`);
    alert("Project workspace has been archived.");
  };

  const handleUpdateMemberRole = (userId: string, newRole: string) => {
    if (!canManageMembers) {
      alert("You do not have permission to manage members.");
      return;
    }
    updateProjectConfig(prev => {
      const nextRoles = { ...(prev.projectRoles || {}) };
      nextRoles[userId] = newRole;
      return {
        ...prev,
        projectRoles: nextRoles
      };
    });
    logActivity(`updated role for workspace member to ${newRole}`);
  };

  const handleTransferOwnership = (userId: string) => {
    if (getMemberRole(user?.id || '') !== 'Owner') {
      alert("Only the current Project Owner can transfer ownership.");
      return;
    }
    if (!window.confirm("Are you sure you want to transfer project ownership? This action is irreversible.")) return;
    
    updateProjectConfig(prev => ({
      ...prev,
      ownerId: userId,
      projectRoles: {
        ...(prev.projectRoles || {}),
        [user!.id]: 'Admin' // Demote previous owner to Admin
      }
    }));
    logActivity(`transferred project ownership`);
    alert("Project ownership transferred successfully.");
  };

  const hasPermissionForRole = (role: string, permissionKey: string): boolean => {
    if (config?.rolePermissions?.[role]?.[permissionKey] !== undefined) {
      return !!config.rolePermissions[role][permissionKey];
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

  const handleTogglePermission = (role: string, permissionKey: string) => {
    if (!canEditSettings) {
      alert("You do not have permission to edit project settings.");
      return;
    }
    
    updateProjectConfig(prev => {
      const rolePermissions = { ...(prev.rolePermissions || {}) };
      if (!rolePermissions[role]) {
        rolePermissions[role] = {};
      }
      
      const currentValue = hasPermissionForRole(role, permissionKey);
      rolePermissions[role][permissionKey] = !currentValue;
      
      return {
        ...prev,
        rolePermissions
      };
    });
    logActivity(`updated permission "${permissionKey}" for role "${role}"`);
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
    <div className="min-h-screen bg-[#08090a] text-slate-200 font-sans antialiased premium-scrollbar selection:bg-indigo-500/30 selection:text-white">
      {/* Visual Depth Injectors */}
      <style>{`
        .glass-panel {
          background: rgba(18, 19, 24, 0.4);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .board-lane {
          background: rgba(13, 14, 18, 0.35);
          backdrop-filter: blur(8px);
        }
        .board-lane-sticky {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #08090a;
        }
        .tab-pill-active {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }
        .smooth-lift {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      {/* Top Navbar details */}
      <div className="border-b border-white/[0.04] bg-[#0c0d10]/60 backdrop-blur-md sticky top-0 z-30 px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/w/${workspaceId}/projects`} className="p-1.5 border border-white/[0.04] hover:border-white/10 bg-white/[0.01] rounded-lg text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white leading-none">{activeProject?.name || 'Project'}</h1>
              <span className="text-[8px] uppercase font-mono tracking-widest px-1.5 py-0.5 border border-white/[0.04] rounded bg-white/[0.02] text-slate-500">
                {config?.workspaceStyle || 'Minimal'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-none font-medium">Deliverables stream control center</p>
          </div>
        </div>

        {/* Minimal Tab Selection Navigation */}
        <div className="flex items-center gap-1 bg-black/20 border border-white/[0.04] rounded-lg p-0.5 max-w-sm self-start sm:self-center">
          {[
            { id: 'dashboard', label: 'Overview', icon: <TrendingUp className="h-3.5 w-3.5" /> },
            { id: 'board', label: 'Board', icon: <Layers className="h-3.5 w-3.5" /> },
            ...(canManageAuditFeed ? [{ id: 'activity', label: 'Audits', icon: <Clock className="h-3.5 w-3.5" /> }] : []),
            ...(canAccessAI ? [{ id: 'ai', label: 'AI Copilot', icon: <Bot className="h-3.5 w-3.5" /> }] : []),
            { id: 'settings', label: 'Settings', icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold border border-transparent transition-all ${activeTab === tab.id
                  ? 'tab-pill-active font-black'
                  : 'text-slate-500 hover:text-slate-300'
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
                  <p className="text-xs text-slate-450 leading-relaxed max-w-md font-medium">
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
                          <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${task.status === 'DONE' ? 'text-emerald-500' : 'text-slate-655'}`} />
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
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter board..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs w-full outline-none placeholder-slate-500 text-slate-200"
                />
              </div>

              {canCreateTask && (
                <button
                  type="button"
                  onClick={() => { setTaskStatus('TODO'); setShowTaskForm(true); }}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
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
                <div className="flex gap-6 overflow-x-auto pb-4 select-none items-stretch min-h-[480px] premium-scrollbar">
                  {config?.columns?.map(col => {
                    const colTasks = filteredKanbanTasks.filter(t => t.status === col.id);
                    return (
                      <div key={col.id} className="board-lane border border-white/[0.03] rounded-2xl p-4 flex flex-col justify-start w-[310px] sm:w-[340px] flex-shrink-0 shadow-sm relative">
                        <div className="board-lane-sticky py-2.5 mb-3 flex items-center justify-between border-b border-white/[0.04]">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${col.id === 'TODO' ? 'bg-slate-400' :
                                col.id === 'IN_PROGRESS' ? 'bg-sky-400' :
                                  col.id === 'IN_REVIEW' ? 'bg-amber-400' : 'bg-emerald-500'
                              }`}></span>
                            <h3 className="text-[10px] font-extrabold text-white uppercase tracking-wider">{col.title}</h3>
                          </div>
                          <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-black/30 border border-white/[0.04] rounded text-slate-500">
                            {colTasks.length}
                          </span>
                        </div>

                        {colTasks.length === 0 ? (
                          /* Interactive Clean Empty State */
                          <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-white/[0.03] rounded-xl bg-white/[0.005]">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lane Empty</p>
                            <p className="text-[10px] text-slate-600 mt-1 leading-normal max-w-[160px]">No deliverables listed here.</p>
                            {col.id === 'TODO' && (
                              <div className="mt-3.5 space-y-1.5">
                                {canCreateTask && (
                                  <button
                                    type="button"
                                    onClick={() => { setTaskStatus('TODO'); setShowTaskForm(true); }}
                                    className="w-full px-3 py-1 bg-indigo-650/10 hover:bg-indigo-650/20 text-indigo-400 font-bold rounded-lg text-[9px] transition"
                                  >
                                    + Create Task
                                  </button>
                                )}
                                {canAccessAI && (
                                  <button
                                    type="button"
                                    onClick={() => { setActiveTab('ai'); setAiPrompt('starter deliverables for project sprint'); }}
                                    className="flex items-center justify-center gap-1 text-[8px] text-slate-500 hover:text-slate-300 font-bold transition mx-auto"
                                  >
                                    <Sparkles className="h-2.5 w-2.5" /> AI Suggest
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <KanbanColumn
                            title={col.title}
                            status={col.id}
                            tasks={colTasks}
                            onTaskClick={setSelectedTask}
                            onAddTask={canCreateTask ? (colId) => { setTaskStatus(colId as TaskStatus); setShowTaskForm(true); } : undefined}
                          />
                        )}
                      </div>
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
                      <span className="text-[9px] text-slate-550 flex items-center gap-1">
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

        {/* ─── TAB 5: DYNAMIC PROJECT SETTINGS & PERMISSIONS DECK ─────────────── */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-150 text-left">
            
            {/* Left Sub-navigation menu */}
            <div className="lg:col-span-1 space-y-2">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 px-3 py-1.5">Project Config</h3>
              <div className="flex flex-col gap-1 bg-black/20 border border-white/[0.03] rounded-2xl p-2.5">
                {[
                  { id: 'general', label: 'General info', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> },
                  { id: 'members', label: 'Team members', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
                  { id: 'permissions', label: 'Roles Matrix', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
                  { id: 'billing', label: 'Plan & Billing', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> }
                ].map(subTab => (
                  <button
                    key={subTab.id}
                    onClick={() => setSettingsSubTab(subTab.id as any)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      settingsSubTab === subTab.id
                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.01]'
                    }`}
                  >
                    {subTab.icon}
                    <span>{subTab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Sub-tab Content Deck */}
            <div className="lg:col-span-3">
              
              {/* 1. GENERAL SUB-TAB */}
              {settingsSubTab === 'general' && (
                <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-6 animate-in fade-in duration-100">
                  <div className="space-y-1 pb-4 border-b border-white/[0.04]">
                    <h3 className="text-sm font-bold text-white">General Project Workspace Settings</h3>
                    <p className="text-[10px] text-slate-500 leading-none">Modify core characteristics and styling configuration templates.</p>
                  </div>

                  {!canEditSettings && (
                    <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 px-4 py-3 text-xs text-amber-400 font-medium">
                      ⚠️ You are in View-Only mode. Saving changes requires the **Edit Project Settings** capability.
                    </div>
                  )}

                  <div className="grid gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Project Name</label>
                        <input
                          type="text"
                          value={projName}
                          disabled={!canEditSettings}
                          onChange={(e) => setProjName(e.target.value)}
                          className="bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2.5 text-xs outline-none text-slate-200 focus:border-indigo-500/55 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Project Delivery Type</label>
                        <select
                          value={projType}
                          disabled={!canEditSettings}
                          onChange={(e) => setProjType(e.target.value)}
                          className="bg-slate-950 border border-white/[0.04] rounded-xl px-3 py-2.5 text-xs outline-none text-slate-400 focus:border-indigo-500/55 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="Internal Product">Internal Product</option>
                          <option value="Client Stream">Client Stream</option>
                          <option value="Research Initiative">Research Initiative</option>
                          <option value="Enterprise Platform">Enterprise Platform</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Description</label>
                      <textarea
                        value={projDesc}
                        disabled={!canEditSettings}
                        onChange={(e) => setProjDesc(e.target.value)}
                        rows={3}
                        className="bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2 text-xs outline-none text-slate-200 focus:border-indigo-500/55 transition resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Primary Stream Goal</label>
                        <input
                          type="text"
                          value={projGoal}
                          disabled={!canEditSettings}
                          onChange={(e) => setProjGoal(e.target.value)}
                          className="bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2.5 text-xs outline-none text-slate-200 focus:border-indigo-500/55 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Workspace Visual Template</label>
                        <select
                          value={projStyle}
                          disabled={!canEditSettings}
                          onChange={(e) => setProjStyle(e.target.value)}
                          className="bg-slate-950 border border-white/[0.04] rounded-xl px-3 py-2.5 text-xs outline-none text-slate-400 focus:border-indigo-500/55 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="Minimal">Minimal (Clean Vercel/Linear)</option>
                          <option value="Professional">Professional (Corporate Slate)</option>
                          <option value="Creative">Creative (Vibrant Electric)</option>
                          <option value="Enterprise">Enterprise (High Density)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {canEditSettings && (
                    <div className="pt-4 border-t border-white/[0.04] flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveGeneralSettings}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white px-5 py-2 text-xs font-bold transition shadow-sm"
                      >
                        Save Configurations
                      </button>
                    </div>
                  )}

                  {/* Danger zone Archiving */}
                  <div className="border border-rose-950/40 bg-rose-950/5 rounded-2xl p-5 space-y-4">
                    <div className="text-left space-y-1">
                      <h4 className="text-xs font-black text-rose-450 uppercase tracking-wider">Danger Zone</h4>
                      <p className="text-[10px] text-slate-500 leading-none">Irreversible workspace administration actions.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 border border-rose-950/20 bg-rose-950/10 rounded-xl">
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-350">Archive Project Workspace</p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-sm">Freeze delivery stream operations. This makes all tasks read-only and locks lanes.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleArchiveProject}
                        disabled={!canEditSettings || config?.archived}
                        className="px-4 py-2 border border-rose-900 bg-rose-950/30 hover:bg-rose-950/60 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-rose-400 font-bold text-xs transition"
                      >
                        {config?.archived ? 'Archived' : 'Archive Stream'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. TEAM MEMBERS SUB-TAB */}
              {settingsSubTab === 'members' && (
                <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-6 animate-in fade-in duration-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.04]">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white">Stream Role Allocations</h3>
                      <p className="text-[10px] text-slate-500 leading-none">Map workspace collaborators to specific project delivery roles.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-950 border border-white/[0.04] rounded-xl px-3 py-1.5 w-full max-w-[200px]">
                      <svg className="h-3.5 w-3.5 text-slate-550" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input
                        type="text"
                        placeholder="Search team..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="bg-transparent text-[11px] w-full outline-none placeholder-slate-650 text-slate-200"
                      />
                    </div>
                  </div>

                  {!canManageMembers && (
                    <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 px-4 py-3 text-xs text-amber-400 font-medium">
                      ⚠️ Managing workspace roles requires the **Manage Members** capability.
                    </div>
                  )}

                  <div className="divide-y divide-white/[0.03] bg-black/10 rounded-2xl border border-white/[0.03] overflow-hidden">
                    {members
                      .filter(m => {
                        const name = m.user?.name || m.user?.email || '';
                        return name.toLowerCase().includes(memberSearchQuery.toLowerCase());
                      })
                      .map(m => {
                        const currentRole = getMemberRole(m.userId);
                        const initials = (m.user?.name || m.user?.email || '?').charAt(0).toUpperCase();
                        
                        return (
                          <div key={m.userId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-white/[0.005] transition">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-905/40 border border-indigo-500/20 flex items-center justify-center font-bold text-xs text-indigo-300 relative">
                                {initials}
                                {/* Presence Dot indicator */}
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#08090a]"></span>
                              </div>
                              <div className="text-left">
                                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                  {m.user?.name || 'Workspace Member'}
                                  {currentRole === 'Owner' && (
                                    <span className="text-[7px] uppercase font-mono tracking-widest px-1 bg-indigo-500/20 text-indigo-400 rounded font-black border border-indigo-500/30">
                                      Owner
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">{m.user?.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 self-end sm:self-center">
                              {currentRole !== 'Owner' && canManageMembers ? (
                                <>
                                  <select
                                    value={currentRole}
                                    onChange={(e) => handleUpdateMemberRole(m.userId, e.target.value)}
                                    className="bg-slate-950 border border-white/[0.04] rounded-lg px-2.5 py-1.5 text-[10px] font-bold outline-none text-slate-400 focus:border-indigo-500/50 transition cursor-pointer"
                                  >
                                    <option value="Admin">Admin</option>
                                    <option value="Project Manager">Project Manager</option>
                                    <option value="Developer">Developer</option>
                                    <option value="Viewer">Viewer</option>
                                  </select>
                                  
                                  {/* Ownership transfer button */}
                                  {getMemberRole(user?.id || '') === 'Owner' && (
                                    <button
                                      type="button"
                                      onClick={() => handleTransferOwnership(m.userId)}
                                      className="px-2.5 py-1.5 text-[9px] font-bold border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] text-indigo-400 rounded-lg transition"
                                      title="Transfer Owner Ownership"
                                    >
                                      Transfer Owner
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] uppercase font-mono px-2 py-1 border border-white/[0.04] bg-slate-950 text-slate-500 rounded font-bold">
                                  {currentRole}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 3. PERMISSIONS DECK MATRIX */}
              {settingsSubTab === 'permissions' && (
                <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-6 animate-in fade-in duration-100">
                  <div className="space-y-1 pb-4 border-b border-white/[0.04]">
                    <h3 className="text-sm font-bold text-white">Dynamic Role Capability Override Matrix</h3>
                    <p className="text-[10px] text-slate-500 leading-none">Customize default role features and lock access rules instantly.</p>
                  </div>

                  {!canEditSettings && (
                    <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 px-4 py-3 text-xs text-amber-400 font-medium">
                      ⚠️ Customizing role capabilities requires the **Edit Project Settings** capability.
                    </div>
                  )}

                  <div className="space-y-4">
                    {['Admin', 'Project Manager', 'Developer', 'Viewer'].map(role => (
                      <div key={role} className="border border-white/[0.03] bg-black/10 rounded-2xl p-4 space-y-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            role === 'Admin' ? 'bg-indigo-500' :
                            role === 'Project Manager' ? 'bg-sky-400' :
                            role === 'Developer' ? 'bg-amber-500' : 'bg-slate-400'
                          }`}></span>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">{role} capabilities</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                          {[
                            { key: 'create_task', label: 'Create Workspace Tasks', desc: 'Allows drafting and inserting new lane cards.' },
                            { key: 'edit_task', label: 'Modify Task Details', desc: 'Enables updating fields, checklist logs, and titles.' },
                            { key: 'delete_task', label: 'Eradicate Tasks', desc: 'Authorizes full removal and deletion of board cards.' },
                            { key: 'move_task', label: 'Re-align Lane States', desc: 'Grants drag-and-drop board placement authorization.' },
                            { key: 'manage_members', label: 'Manage Stream Collaborators', desc: 'Allows role changes and member additions.' },
                            { key: 'edit_project_settings', label: 'Edit Project Settings', desc: 'Unlocks General panel, matrices, and danger archiving.' },
                            { key: 'access_ai', label: 'Engage AI Copilot', desc: 'Allows generating subtasks and status synthesis.' },
                            { key: 'manage_audit_feed', label: 'Audit Timeline Feeds', desc: 'Grants viewing of detailed stream updates.' }
                          ].map(perm => {
                            const isChecked = hasPermissionForRole(role, perm.key);
                            return (
                              <div key={perm.key} className="flex items-center justify-between p-3 border border-white/[0.02] bg-white/[0.005] rounded-xl hover:border-slate-850/60 transition">
                                <div className="text-left pr-4">
                                  <p className="font-bold text-slate-200 text-xs">{perm.label}</p>
                                  <p className="text-[9px] text-slate-500 leading-normal mt-0.5 max-w-[190px]">{perm.desc}</p>
                                </div>
                                <button
                                  type="button"
                                  disabled={!canEditSettings}
                                  onClick={() => handleTogglePermission(role, perm.key)}
                                  className={`w-9 h-5 flex-shrink-0 rounded-full p-0.5 transition-all duration-200 border outline-none ${
                                    isChecked
                                      ? 'bg-indigo-600 border-indigo-500/20 justify-end'
                                      : 'bg-slate-900 border-white/[0.04] justify-start'
                                  } flex items-center disabled:opacity-40 disabled:cursor-not-allowed`}
                                >
                                  <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-200"></span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. PLAN & BILLING CARD */}
              {settingsSubTab === 'billing' && (
                <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-6 animate-in fade-in duration-100">
                  <div className="space-y-1 pb-4 border-b border-white/[0.04]">
                    <h3 className="text-sm font-bold text-white">SaaS Stream Subscriptions</h3>
                    <p className="text-[10px] text-slate-500 leading-none">Benchmark quotas, manage billing configurations, and unlock addons.</p>
                  </div>

                  {/* Gradient PRO upgrade card */}
                  <div className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/20 via-[#0e0f12] to-cyan-950/15 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
                    {/* Glowing highlight */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-tr from-indigo-500/10 to-cyan-500/5 blur-3xl rounded-full pointer-events-none"></div>

                    <div className="space-y-2 text-left relative z-10">
                      <span className="text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                        Enterprise Delivery Plan
                      </span>
                      <h4 className="text-lg font-bold text-white flex items-center gap-1.5 mt-1.5">
                        Active Workspace Stream <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                        This workspace stream is configured with fully unlocked Pro features: Unlimited subtask generation, Dynamic permission override matrices, and Timeline Log storage.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => alert("Simulated Billing Portal: Loading stripe panel context...")}
                      className="px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-550 hover:from-indigo-550 hover:to-indigo-500 text-white font-bold text-xs transition relative z-10 shadow-md shadow-indigo-950/50"
                    >
                      Manage Billing
                    </button>
                  </div>

                  {/* Quota breakdown meters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Stream Members', val: '5 / 50 seats', percent: 10, color: 'bg-indigo-500' },
                      { label: 'Cloud Storage', val: '1.2 GB / 100 GB', percent: 1.2, color: 'bg-sky-400' },
                      { label: 'AI Suggestion Tokens', val: '42,500 / 500,000', percent: 8.5, color: 'bg-emerald-500' }
                    ].map((quota, idx) => (
                      <div key={idx} className="border border-white/[0.03] bg-black/10 rounded-2xl p-4.5 space-y-2 text-left">
                        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{quota.label}</p>
                        <p className="text-xs font-bold text-slate-200">{quota.val}</p>
                        <div className="w-full h-1 bg-white/[0.02] rounded-full overflow-hidden">
                          <div className={`h-full ${quota.color} rounded-full`} style={{ width: `${quota.percent}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
            </div>
          </div>
        )}
      </div>

      {/* ─── CREATE TASK OVERLAY MODAL ────────────────────────────────── */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050607]/80 px-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0e0f12] border border-white/[0.04] rounded-2xl p-5 text-white shadow-2xl space-y-4 text-left animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-3">
              <h2 className="text-sm font-bold text-white">Create Workspace Task</h2>
              <button type="button" onClick={() => setShowTaskForm(false)} className="text-slate-500 hover:text-white transition">✕</button>
            </div>

            <div className="grid gap-3.5">
              <div className="grid gap-1">
                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  placeholder="Task title..."
                  value={taskTitle}
                  onChange={(e) => {
                    setTaskTitle(e.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  className={`bg-slate-950 border rounded-xl px-4 py-2.5 text-xs outline-none text-slate-200 placeholder-slate-650 transition ${
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
                  placeholder="Task specifications..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                  className="bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500/50 text-slate-200 placeholder-slate-650 transition resize-none"
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
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold hover:bg-slate-900 transition text-slate-400"
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
