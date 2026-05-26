import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { useTaskStore } from '../../stores/taskStore';
import { useProjectStore } from '../../stores/projectStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';
import { useSnippetStore } from '../../stores/snippetStore';
import KanbanColumn from '../../components/kanban/KanbanColumn';
import TaskModal from '../../components/kanban/TaskModal';
import OnlineAvatars from '../../components/presence/OnlineAvatars';
import { usePresence } from '../../hooks/usePresence';
import { useTaskSync } from '../../hooks/useTaskSync';
import { Task, TaskStatus } from '../../types';
import ListView from './ListView';
import CalendarView from './CalendarView';
import {
  Search, Plus, Clock, Bot, Calendar,
  TrendingUp, CheckCircle2, Layers,
  Code, Copy, Users, Trash2, X, CheckSquare, FileText
} from 'lucide-react';
import { toast } from '../../stores/toastStore';


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
  assignees?: Record<string, any>;
  tags?: Record<string, string[]>;
  attachments?: Record<string, any[]>;
  checklists?: Record<string, any[]>;
}



export default function TasksPage(): React.ReactElement {
  const { workspaceId, projectId: pid } = useParams<{ workspaceId: string; projectId: string }>();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const tabParam = queryParams.get('tab');

  const { tasks, loading, error, fetchTasksByProject, createTask, updateTask, deleteTask, addComment } = useTaskStore();
  const { projects, projectMembers, fetchProjectMembers, assignProjectMember, removeProjectMember } = useProjectStore();
  const { members } = useWorkspaceStore();
  const activeProjMembers = pid ? (projectMembers[pid] || []) : [];
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'mytasks' | 'activity' | 'ai' | 'snippets'>('dashboard');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedWorkspaceMemberId, setSelectedWorkspaceMemberId] = useState('');
  const [selectedProjectRole, setSelectedProjectRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');

  const { onlineUsers } = usePresence(workspaceId || '', pid);
  const othersOnline = onlineUsers.filter(u => u.userId !== user?.id);
  useTaskSync(pid || '');

  // Switcher & Filters States
  const [taskView, setTaskView] = useState<'board' | 'list' | 'calendar'>(() => {
    return (localStorage.getItem('devcollab_last_task_view') as any) || 'board';
  });

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterLabel, setFilterLabel] = useState<string>('');
  const [filterDueDate, setFilterDueDate] = useState<string>('');

  // Memoized local storage lookup to derive labels for filtering
  const localMetadata = useMemo(() => {
    try {
      const stored = localStorage.getItem(`devcollab_project_workspace_${pid}`);
      if (stored) {
        const config = JSON.parse(stored);
        return {
          tags: config.tags || {},
        };
      }
    } catch {}
    return { tags: {} };
  }, [tasks, pid]);

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

  useEffect(() => {
    if (user && getMemberRole(user.id) === 'Viewer') {
      if (activeTab !== 'dashboard' && activeTab !== 'board') {
        setActiveTab('dashboard');
      }
    }
  }, [activeTab, user, activeProjMembers]);




  // Task Creation & Draft Recovery States
  const [hasActiveDraft, setHasActiveDraft] = useState(false);
  const [draftRecoveryKey, setDraftRecoveryKey] = useState<string | null>(null);

  // Highlight tasks freshly added from AI (passed via navigation state)
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(() => {
    const ids: string[] = (location.state as any)?.aiAddedTaskIds ?? [];
    return new Set(ids);
  });

  // If we arrived with aiAddedTaskIds → auto-switch to Board and clear after 4 s
  useEffect(() => {
    const ids: string[] = (location.state as any)?.aiAddedTaskIds ?? [];
    if (ids.length > 0) {
      setActiveTab('board');
      setHighlightedTaskIds(new Set(ids));
      const t = setTimeout(() => setHighlightedTaskIds(new Set()), 4000);
      return () => clearTimeout(t);
    }
  }, [location.state]);


  // Project Workspace local metadata config
  const [config, setConfig] = useState<ProjectWorkspaceConfig | null>(null);

  const handleUpdateMetadata = (taskId: string, category: 'assignees' | 'tags' | 'attachments' | 'checklists', data: any) => {
    updateProjectConfig(prev => {
      const next = { ...prev };
      if (!next[category]) next[category] = {};
      if (data === null || data === undefined) {
        delete next[category][taskId];
      } else {
        next[category][taskId] = data;
      }
      return next;
    });
  };

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === pid);
  }, [projects, pid]);

  // ─── My Tasks Dashboard Calculations ───────────────────────────
  const myTasks = useMemo(() => {
    return tasks.filter(t => t.assigneeId === user?.id);
  }, [tasks, user]);

  const overdueMyTasks = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return myTasks.filter(t => {
      const dueStr = t.dueDate ? t.dueDate.substring(0, 10) : '';
      return dueStr && dueStr < todayStr && t.status !== 'DONE';
    });
  }, [myTasks]);

  const completedMyTasks = useMemo(() => {
    return myTasks.filter(t => t.status === 'DONE');
  }, [myTasks]);

  const inReviewMyTasks = useMemo(() => {
    return myTasks.filter(t => t.status === 'IN_REVIEW');
  }, [myTasks]);

  const todayMyTasks = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return myTasks.filter(t => {
      const dueStr = t.dueDate ? t.dueDate.substring(0, 10) : '';
      return (dueStr === todayStr && t.status !== 'DONE') || (t.priority === 'P0' && t.status !== 'DONE');
    });
  }, [myTasks]);

  const activeBacklogMyTasks = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return myTasks.filter(t => {
      const dueStr = t.dueDate ? t.dueDate.substring(0, 10) : '';
      const isOverdue = dueStr && dueStr < todayStr;
      const isTodayOrP0 = dueStr === todayStr || t.priority === 'P0';
      return t.status !== 'DONE' && t.status !== 'IN_REVIEW' && !isOverdue && !isTodayOrP0;
    });
  }, [myTasks]);

  const getMemberRole = (userId: string): string => {
    const wsMember = members.find(m => m.userId === userId);
    if (wsMember?.role === 'OWNER') return 'Owner';
    if (wsMember?.role === 'ADMIN') return 'Admin';
    if (activeProject?.createdBy?.id === userId) return 'Owner';

    const pm = activeProjMembers.find(m => m.userId === userId);
    if (pm) {
      if (pm.role === 'ADMIN') return 'Admin';
      if (pm.role === 'VIEWER') return 'Viewer';
      return 'Developer';
    }

    if (wsMember?.role === 'VIEWER') return 'Viewer';
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
      void fetchProjectMembers(pid);
      loadConfig();
    }
  }, [pid, fetchTasksByProject, fetchProjectMembers]);

  useEffect(() => {
    if (pid) {
      const keys = Object.keys(sessionStorage);
      const draftKey = keys.find(k => k.startsWith(`devcollab_draft_task_${pid}_`));
      if (draftKey) {
        try {
          const stored = sessionStorage.getItem(draftKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.task) {
              setHasActiveDraft(true);
              setDraftRecoveryKey(draftKey);
            }
          }
        } catch (e) {
          console.error("Failed to parse draft recovery from sessionStorage", e);
        }
      } else {
        setHasActiveDraft(false);
        setDraftRecoveryKey(null);
      }
    }
  }, [pid]);

  const handleRestoreDraft = () => {
    if (draftRecoveryKey) {
      try {
        const stored = sessionStorage.getItem(draftRecoveryKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.task) {
            setSelectedTask(parsed.task);
          }
        }
      } catch (e) {
        console.error("Failed to restore draft", e);
      }
    }
    setHasActiveDraft(false);
  };

  const handleDiscardDraftFromPrompt = () => {
    if (draftRecoveryKey) {
      sessionStorage.removeItem(draftRecoveryKey);
    }
    setHasActiveDraft(false);
    setDraftRecoveryKey(null);
  };




  useEffect(() => {
    if (config && pid) {
      localStorage.setItem(`devcollab_project_workspace_${pid}`, JSON.stringify(config));
    }
  }, [config, pid]);

  const updateProjectConfig = (updater: (prev: ProjectWorkspaceConfig) => ProjectWorkspaceConfig) => {
    setConfig(prev => {
      if (!prev) return prev;
      return updater(prev);
    });
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




  const handleInstantTaskCreate = (status: TaskStatus = 'TODO', dueDate?: Date) => {
    if (!pid) {
      toast.error('Missing project', 'Project ID is missing. Please reload the page.');
      return;
    }
    const uuid = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    const draftTask: Task = {
      id: `draft-${uuid}`,
      title: '',
      description: '',
      status: status || 'TODO',
      priority: 'P2',
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      projectId: pid,
      assigneeId: null,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: {
        id: user?.id || 'current',
        name: user?.name || 'You',
        email: user?.email || '',
        avatar: user?.avatar || undefined,
      },
    };
    setSelectedTask(draftTask);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canMoveTask) {
      toast.error('Permission denied', 'You cannot move tasks in this project workspace.');
      return;
    }
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = String(over.id);
    const nextStatus = (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(overId) ? overId : 'TODO') as TaskStatus;

    if (activeTask.status !== nextStatus) {
      logActivity(`moved task "${activeTask.title}" to ${nextStatus.replace('_', ' ')}`);
      void updateTask(activeTask.id, { status: nextStatus }).catch((err) => {
        toast.error('Failed to move task', err.message);
      });
    }
  };

  // AI Copilot tab — navigate to real AI assistant (not a stub)
  const navigate = useNavigate();
  const handleOpenAIAssistant = () => {
    navigate(`/w/${workspaceId}/p/${pid}/ai`);
  };

  // Stats
  const completedCount = useMemo(() => tasks.filter(t => t.status === 'DONE').length, [tasks]);
  const totalCount = useMemo(() => tasks.length, [tasks]);
  const percentComplete = useMemo(() => totalCount ? Math.round((completedCount / totalCount) * 100) : 0, [completedCount, totalCount]);

  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter(t => t.dueDate && t.status !== 'DONE')
      .map(t => ({ ...t, parsedDate: new Date(t.dueDate!) }))
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
      .slice(0, 3);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 2. Status
      if (filterStatus && t.status !== filterStatus) return false;

      // 3. Priority
      if (filterPriority && t.priority !== filterPriority) return false;

      // Local metadata lookups for assignee and tags
      let localAssigneeId = '';
      let localTags: string[] = [];
      try {
        const stored = localStorage.getItem(`devcollab_project_workspace_${t.projectId}`);
        if (stored) {
          const cfg = JSON.parse(stored);
          localAssigneeId = cfg.assignees?.[t.id]?.id || '';
          localTags = cfg.tags?.[t.id] || [];
        }
      } catch {}

      // 4. Assignee
      if (filterAssignee && localAssigneeId !== filterAssignee) return false;

      // 5. Label
      if (filterLabel && !localTags.includes(filterLabel)) return false;

      // 6. Due Date
      if (filterDueDate) {
        if (!t.dueDate) {
          return filterDueDate === 'no_due_date';
        }
        
        const due = new Date(t.dueDate);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        if (filterDueDate === 'overdue') {
          return due < new Date() && t.status !== 'DONE';
        } else if (filterDueDate === 'today') {
          return due >= today && due < tomorrow;
        } else if (filterDueDate === 'week') {
          return due >= today && due <= endOfWeek;
        }
      }

      return true;
    });
  }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee, filterLabel, filterDueDate]);

  const filteredActivities = useMemo(() => {
    if (!config?.activities) return [];
    return config.activities.filter(act => {
      // 1. Filter by Member / Assignee (loose match by userName)
      if (filterAssignee) {
        const memberName = members.find(m => m.userId === filterAssignee)?.user?.name || '';
        if (memberName && !act.userName.toLowerCase().includes(memberName.toLowerCase())) return false;
      }
      
      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDetails = act.details.toLowerCase().includes(query);
        const matchesUser = act.userName.toLowerCase().includes(query);
        if (!matchesDetails && !matchesUser) return false;
      }
      
      return true;
    });
  }, [config?.activities, filterAssignee, searchQuery, members]);

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
      `}</style>
      {/* Top Navbar details */}
      <div className="border-b border-white/[0.04] bg-[#17191d]/85 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white leading-none">{activeProject?.name || 'Your project name'}</h1>
            </div>
          </div>
        </div>

        {/* Minimal Tab Selection Navigation and Actions */}
        <div className="flex items-center gap-4 self-start sm:self-center">
          <div className="flex items-center gap-1 bg-black/20 border border-white/[0.04] rounded-lg p-0.5">
            {[
              { id: 'dashboard', label: 'Overview', icon: <TrendingUp className="h-3.5 w-3.5" /> },
              { id: 'board', label: 'Board', icon: <Layers className="h-3.5 w-3.5" /> },
              ...(getMemberRole(user?.id || '') !== 'Owner' ? [{ id: 'mytasks', label: 'My Tasks', icon: <CheckSquare className="h-3.5 w-3.5" /> }] : []),
              ...(canManageAuditFeed ? [{ id: 'activity', label: 'Audits', icon: <Clock className="h-3.5 w-3.5" /> }] : []),
              ...(canAccessAI ? [{ id: 'ai', label: 'AI Copilot', icon: <Bot className="h-3.5 w-3.5" /> }] : []),
              { id: 'snippets', label: 'Snippets', icon: <Code className="h-3.5 w-3.5" /> }
            ].filter(tab => {
              if (getMemberRole(user?.id || '') === 'Viewer') {
                return tab.id === 'dashboard' || tab.id === 'board';
              }
              return true;
            }).map(tab => (
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

          <div className="flex items-center gap-2">
            <OnlineAvatars workspaceId={workspaceId || ''} projectId={pid} />
            
            {(getMemberRole(user?.id || '') === 'Owner' || getMemberRole(user?.id || '') === 'Admin') && (
              <button
                type="button"
                onClick={() => setShowMembersModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-slate-300 hover:text-white transition-all text-xs font-semibold leading-none shadow-sm"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Manage Members</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {hasActiveDraft && (
          <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Restore unfinished draft?</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">You have a saved draft for this project workspace from your last session.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleDiscardDraftFromPrompt}
                className="px-3.5 py-1.5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] text-slate-400 hover:text-white font-bold text-[10px] transition"
              >
                Discard Draft
              </button>
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition shadow-md"
              >
                Restore Draft
              </button>
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-950 bg-rose-950/20 px-4 py-2.5 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* ─── TAB 1: OVERVIEW DASHBOARD ───────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150 text-left">
            {/* Left Column: Progress circle & Recent Milestones */}
            <div className="lg:col-span-2 space-y-6">
              {/* Workspace Progress Card */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">📊 Delivery Stream Progress</span>
                  <h2 className="text-xl font-bold text-white mt-1">{activeProject?.name || 'Overview'}</h2>
                  {(activeProject?.description || config?.description) ? (
                    <p className="text-xs text-slate-400 leading-relaxed max-w-md font-medium mt-1">
                      {activeProject?.description || config?.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic mt-1">No project workspace description provided.</p>
                  )}
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

              {/* Status Breakdown Stats Overview Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: '🎯 To Do', count: tasks.filter(t => t.status === 'TODO').length, color: 'text-slate-400 border-white/[0.03] bg-white/[0.01]' },
                  { label: '⚡ In Progress', count: tasks.filter(t => t.status === 'IN_PROGRESS').length, color: 'text-cyan-400 border-cyan-500/10 bg-cyan-500/[0.02]' },
                  { label: '👀 In Review', count: tasks.filter(t => t.status === 'IN_REVIEW').length, color: 'text-purple-400 border-purple-500/10 bg-purple-500/[0.02]' },
                  { label: '✅ Completed', count: tasks.filter(t => t.status === 'DONE').length, color: 'text-emerald-400 border-emerald-500/10 bg-emerald-500/[0.02]' },
                ].map(stat => (
                  <div key={stat.label} className={`p-4 rounded-2xl border ${stat.color} text-center space-y-1`}>
                    <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-slate-500 block">{stat.label}</span>
                    <p className="text-2xl font-black text-white">{stat.count}</p>
                  </div>
                ))}
              </div>

              {/* Recent Tasks Panel */}
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">⚡ Recent Deliverables</h3>
                  <span className="text-[10px] text-slate-500 font-bold">Showing last 4 updates</span>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 space-y-2.5">
                      <p className="text-xs text-slate-500 italic">No milestones built yet.</p>
                      {canCreateTask && (
                        <button type="button" onClick={() => void handleInstantTaskCreate('TODO')} className="px-3 py-1.5 border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] text-indigo-400 font-bold rounded-lg text-[10px] transition">
                          + Create Task
                        </button>
                      )}
                    </div>
                  ) : (
                    tasks.slice(0, 4).map((task: Task) => (
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
            <div className="space-y-6">
              {/* Quick actions grid */}
              <div className="glass-panel rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center gap-1.5 border-b border-white/[0.04] pb-2">
                  <span className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">⚙️ Navigation</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  {canCreateTask ? (
                    <button type="button" onClick={() => void handleInstantTaskCreate('TODO')} className="p-2.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 text-indigo-300 font-bold rounded-xl transition">
                      + New Task
                    </button>
                  ) : (
                    <div />
                  )}
                  <button type="button" onClick={() => setActiveTab('board')} className="p-2.5 bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 text-cyan-300 font-bold rounded-xl transition">
                    Open Board
                  </button>
                </div>
              </div>

              {/* Deadlines Widget */}
              <div className="glass-panel rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-1.5 border-b border-white/[0.04] pb-2">
                  <span className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">⏰ Upcoming Deadlines</span>
                </div>
                <div className="space-y-2">
                  {upcomingDeadlines.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-2 text-center">No upcoming deadlines.</p>
                  ) : (
                    upcomingDeadlines.map(task => (
                      <div key={task.id} className="flex justify-between items-center text-xs p-2 border border-white/[0.04] rounded-lg bg-black/10 cursor-pointer hover:border-indigo-500/20 transition" onClick={() => setSelectedTask(task)}>
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
                <div className="flex items-center gap-1.5 border-b border-white/[0.04] pb-2">
                  <span className="text-[10px] font-mono font-extrabold text-slate-500 uppercase tracking-widest">👥 Project Members</span>
                </div>
                <div className="space-y-2.5">
                  {activeProjMembers.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-2 text-center">No members available.</p>
                  ) : (
                    activeProjMembers.map(m => (
                      <div key={m.userId} className="flex items-center justify-between text-xs py-0.5 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2">
                          <div className="w-5.5 h-5.5 rounded-full bg-indigo-650 flex items-center justify-center font-bold text-[8px] text-white">
                            {(m.user?.name || m.user?.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-300 truncate max-w-[120px]">{m.user?.name || m.user?.email}</span>
                        </div>
                        <span className="text-[8px] uppercase font-mono px-1.5 py-0.5 border border-white/[0.04] rounded text-slate-500">
                          {getMemberRole(m.userId) === 'Owner' ? 'Owner' : m.role === 'ADMIN' ? 'Lead' : m.role === 'VIEWER' ? 'Viewer' : 'Member'}
                        </span>
                      </div>
                    ))
                  )}
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

              {/* Segmented view switcher */}
              <div className="flex items-center gap-1 bg-black/25 border border-white/[0.04] rounded-xl p-0.5 self-start">
                {[
                  { id: 'board', label: 'Board' },
                  { id: 'list', label: 'List' },
                  { id: 'calendar', label: 'Calendar' }
                ].map(view => (
                  <button
                    key={view.id}
                    onClick={() => {
                      setTaskView(view.id as any);
                      localStorage.setItem('devcollab_last_task_view', view.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                      taskView === view.id
                        ? 'bg-indigo-650 text-white shadow-sm border border-white/[0.04]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {othersOnline.length > 0 && (
                  <div className="flex flex-col items-end hidden sm:flex">
                    <OnlineAvatars workspaceId={workspaceId} projectId={pid} size="sm" />
                    <span className="text-[10px] text-gray-500 mt-0.5">{othersOnline.length} people viewing</span>
                  </div>
                )}
                {canCreateTask && (
                  <button
                    type="button"
                    onClick={() => void handleInstantTaskCreate('TODO')}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create Task
                  </button>
                )}
              </div>
            </div>

            {/* Developer-centric Filter selectors */}
            <div className="flex flex-wrap gap-2 items-center bg-black/10 border border-white/[0.03] rounded-xl p-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 mr-1.5">Filters:</span>

              {/* Status Selector */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-white/[0.04] text-[10px] font-bold text-slate-400 hover:text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>

              {/* Priority Selector */}
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-slate-950 border border-white/[0.04] text-[10px] font-bold text-slate-400 hover:text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="">All Priorities</option>
                <option value="P0">P0 (Critical)</option>
                <option value="P1">P1 (High)</option>
                <option value="P2">P2 (Normal)</option>
              </select>

              {/* Assignee Selector */}
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="bg-slate-950 border border-white/[0.04] text-[10px] font-bold text-slate-400 hover:text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 transition max-w-[140px] cursor-pointer"
              >
                <option value="">Anyone</option>
                {members.map(m => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.name || m.user?.email || 'Unknown'}
                  </option>
                ))}
              </select>

              {/* Due Date Filter */}
              <select
                value={filterDueDate}
                onChange={(e) => setFilterDueDate(e.target.value)}
                className="bg-slate-950 border border-white/[0.04] text-[10px] font-bold text-slate-400 hover:text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="">Any Due Date</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due Today</option>
                <option value="week">Due This Week</option>
                <option value="no_due_date">No Due Date</option>
              </select>

              {/* Labels Filter */}
              <select
                value={filterLabel}
                onChange={(e) => setFilterLabel(e.target.value)}
                className="bg-slate-950 border border-white/[0.04] text-[10px] font-bold text-slate-400 hover:text-white rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="">All Labels</option>
                {Array.from(
                  new Set(
                    Object.values(localMetadata.tags || {}).flat() as string[]
                  )
                ).map(tag => (
                  <option key={tag} value={tag}>
                    🏷️ {tag}
                  </option>
                ))}
              </select>

              {/* Clear filters trigger */}
              {(filterStatus || filterPriority || filterAssignee || filterLabel || filterDueDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus('');
                    setFilterPriority('');
                    setFilterAssignee('');
                    setFilterLabel('');
                    setFilterDueDate('');
                  }}
                  className="px-2.5 py-1 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold uppercase rounded-lg text-[9px] transition"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-24 text-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : taskView === 'board' ? (
              <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                <div className="flex gap-6 overflow-x-auto pb-4 select-none items-start min-h-[480px] premium-scrollbar">
                  {config?.columns?.map(col => {
                    const colTasks = filteredTasks.filter(t => t.status === col.id);
                    return (
                      <KanbanColumn
                        key={col.id}
                        title={col.title}
                        status={col.id}
                        tasks={colTasks}
                        config={config}
                        highlightedTaskIds={highlightedTaskIds}
                        onTaskClick={setSelectedTask}
                        onAddTask={canCreateTask ? (colId) => void handleInstantTaskCreate(colId as TaskStatus) : undefined}
                        isDraggable={canMoveTask}
                      />
                    );
                  })}
                </div>
              </DndContext>
            ) : taskView === 'list' ? (
              <ListView
                tasks={filteredTasks}
                members={members}
                config={config}
                onUpdateMetadata={handleUpdateMetadata}
                onTaskClick={setSelectedTask}
                onUpdateTask={async (id, updates) => {
                  const res = await updateTask(id, { ...updates, dueDate: updates.dueDate === null ? undefined : updates.dueDate });
                  logActivity(`updated task: "${res.title}"`);
                  return res;
                }}
                projectId={pid!}
              />
            ) : (
              <CalendarView
                tasks={filteredTasks}
                config={config}
                onUpdateMetadata={handleUpdateMetadata}
                onTaskClick={setSelectedTask}
                onUpdateTask={async (id, updates) => {
                  const res = await updateTask(id, { ...updates, dueDate: updates.dueDate === null ? undefined : updates.dueDate });
                  logActivity(`updated task: "${res.title}"`);
                  return res;
                }}
                onDayClick={canCreateTask ? (date) => void handleInstantTaskCreate('TODO', date) : undefined}
              />
            )}
          </div>
        )}

        {/* ─── TAB 3: TIMELINE AUDIT FEED ──────────────────────────────────────── */}
        {activeTab === 'activity' && canManageAuditFeed && (
          <div className="w-full max-w-5xl space-y-6 animate-in fade-in duration-150 text-left pl-2">
            <div className="text-left space-y-1 pb-4 border-b border-white/[0.04] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Timeline Audit Logs</h2>
                <p className="text-[10px] text-slate-500 leading-none mt-1">Chronological pipeline logs tracking workspace updates.</p>
              </div>

              {/* Audit Filter Controls */}
              <div className="flex flex-wrap gap-2 items-center bg-black/20 border border-white/[0.04] rounded-xl p-2 self-start sm:self-center">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 px-1">Filter Logs:</span>
                
                <div className="flex items-center gap-1.5 bg-slate-950 border border-white/[0.04] rounded-lg px-2 py-1 w-32 focus-within:border-indigo-500/35 transition">
                  <Search className="h-3 w-3 text-slate-500 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-[9px] w-full outline-none placeholder-slate-600 text-slate-200"
                  />
                </div>

                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="bg-slate-950 border border-white/[0.04] text-[9px] font-bold text-slate-400 hover:text-white rounded-lg px-1.5 py-1 outline-none focus:border-indigo-500 transition cursor-pointer max-w-[100px]"
                >
                  <option value="">All Members</option>
                  {members.map(m => (
                    <option key={m.userId} value={m.userId}>
                      👤 {m.user?.name || m.user?.email || 'Unknown'}
                    </option>
                  ))}
                </select>

                {(searchQuery || filterAssignee) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterAssignee('');
                    }}
                    className="px-1.5 py-0.5 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold uppercase rounded text-[8px] transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="relative space-y-6 py-2 text-left">
              {/* Vertical Glowing Git Branch Line */}
              <div className="absolute left-[7px] top-4 bottom-8 w-[2px] bg-gradient-to-b from-indigo-500/50 via-purple-500/30 to-slate-800/10 rounded-full" />

              {filteredActivities.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic py-4 pl-8">No logged entries.</p>
              ) : (
                filteredActivities.map(act => {
                  // Determine git diff stats based on details content
                  const det = act.details.toLowerCase();
                  let diffText = '1 task modified (~)';
                  let diffStyle = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/15';
                  if (det.includes('created task') || det.includes('created project')) {
                    diffText = '1 task created (+)';
                    diffStyle = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15';
                  } else if (det.includes('deleted task')) {
                    diffText = '1 task deleted (-)';
                    diffStyle = 'text-rose-400 bg-rose-500/10 border-rose-500/15';
                  } else if (det.includes('commented')) {
                    diffText = '1 comment added (+)';
                    diffStyle = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/15';
                  }

                  return (
                    <div key={act.id} className="relative pl-8 group/commit max-w-4xl">
                      {/* Glowing Commit Node */}
                      <span className="absolute left-[3px] top-[14px] w-2.5 h-2.5 rounded-full bg-[#121316] border-[2.5px] border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] z-10 flex-shrink-0 group-hover/commit:border-indigo-400 group-hover/commit:scale-110 transition duration-150" />
                      
                      {/* Commit Card Container */}
                      <div className="bg-[#17191d]/50 border border-white/[0.04] rounded-xl p-4 space-y-2.5 hover:bg-[#1c1e23] hover:border-indigo-500/10 transition duration-150 shadow-sm text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.03] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] uppercase font-black tracking-wider text-slate-500 bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded font-mono">
                              main
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">origin/main</span>
                          </div>
                          
                          {/* Commit Date */}
                          <span className="text-[9px] text-slate-500 font-semibold flex items-center gap-1 font-mono">
                            Date: {new Date(act.timestamp).toUTCString().replace('GMT', 'UTC')}
                          </span>
                        </div>

                        {/* Commit Message & Author info */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <p className="text-xs text-slate-200 font-bold leading-relaxed tracking-wide font-mono truncate">
                              {act.details}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <div className="w-4 h-4 rounded-full bg-indigo-650 flex items-center justify-center font-bold text-[7px] text-white">
                                {act.userName.charAt(0).toUpperCase()}
                              </div>
                              <span>
                                Author: <span className="font-semibold text-slate-350">{act.userName}</span> &lt;{act.userName.toLowerCase().replace(/\s+/g, '')}@devcollab.com&gt;
                              </span>
                            </div>
                          </div>

                          {/* Git Diff Stats Pill */}
                          <span className={`text-[8px] font-mono font-extrabold uppercase px-2 py-0.5 border rounded-full self-start sm:self-center shrink-0 ${diffStyle}`}>
                            {diffText}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 4: AI ASSISTANT — redirect to real AI page ──────────────── */}
        {activeTab === 'ai' && (
          <div className="flex flex-col items-center justify-center py-20 gap-6 animate-in fade-in duration-150">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="text-3xl leading-none">✨</span>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-white">Team Intelligence Center</h2>
              <p className="text-sm text-slate-400 max-w-sm">
                Code review, project summaries, standup generation, wiki planning, and task breakdown — all powered by Devcollab.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAIAssistant}
              className="flex items-center gap-2 px-6 py-3 rounded-xl
                         bg-gradient-to-r from-violet-600 to-indigo-600
                         hover:from-violet-500 hover:to-indigo-500
                         text-white font-semibold text-sm
                         transition-all duration-200
                         shadow-lg shadow-violet-500/20"
            >
              Open AI Assistant →
            </button>
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

        {/* ─── TAB: MY TASKS DAILY DASHBOARD ───────────────────────────────────── */}
        {activeTab === 'mytasks' && (
          <div className="space-y-8 animate-in fade-in duration-150 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Daily Focus</h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">Coordinate your deliverables and task accountability in real-time.</p>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel rounded-xl p-3 space-y-1 border border-white/[0.04] bg-white/[0.005]">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-500 block">Assigned Tasks</span>
                <span className="text-xl font-black text-white">{myTasks.length}</span>
              </div>
              <div className="glass-panel rounded-xl p-3 space-y-1 border border-white/[0.04] bg-white/[0.005]">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-rose-500 block">Overdue Count</span>
                <span className="text-xl font-black text-rose-450">{overdueMyTasks.length}</span>
              </div>
              <div className="glass-panel rounded-xl p-3 space-y-1 border border-white/[0.04] bg-white/[0.005]">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-purple-400 block">Pending Review</span>
                <span className="text-xl font-black text-purple-400">{inReviewMyTasks.length}</span>
              </div>
              <div className="glass-panel rounded-xl p-3 space-y-1 border border-white/[0.04] bg-white/[0.005]">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-emerald-500 block">Completed</span>
                <span className="text-xl font-black text-emerald-400">{completedMyTasks.length}</span>
              </div>
            </div>

            {/* 4 Dashboard Lists Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Column 1: Overdue */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-rose-500/10 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    ⚠️ Overdue ({overdueMyTasks.length})
                  </h3>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto premium-scrollbar pr-1">
                  {overdueMyTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-4 text-center">No overdue tasks.</p>
                  ) : (
                    overdueMyTasks.map(t => (
                      <div key={t.id} onClick={() => setSelectedTask(t)} className="p-2 bg-rose-950/10 border border-rose-950/30 rounded-lg hover:border-rose-500/30 hover:bg-rose-950/20 transition cursor-pointer space-y-1">
                        <h4 className="text-[11px] font-bold text-slate-200 line-clamp-1">{t.title}</h4>
                        <div className="flex justify-between items-center text-[8px] text-slate-500">
                          <span className="bg-rose-500/10 text-rose-400 px-1 py-0.5 rounded font-extrabold">{t.priority}</span>
                          <span className="text-rose-400 font-bold">{t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Today & High Priority */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                    🔥 Today / P0 ({todayMyTasks.length})
                  </h3>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto premium-scrollbar pr-1">
                  {todayMyTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-4 text-center">No high priority tasks today.</p>
                  ) : (
                    todayMyTasks.map(t => (
                      <div key={t.id} onClick={() => setSelectedTask(t)} className="p-2 bg-[#1e2025] border border-white/[0.04] rounded-lg hover:border-indigo-500/20 hover:bg-[#25282e] transition cursor-pointer space-y-1">
                        <h4 className="text-[11px] font-bold text-slate-200 line-clamp-1">{t.title}</h4>
                        <div className="flex justify-between items-center text-[8px] text-slate-500">
                          <span className={`px-1 py-0.5 rounded font-extrabold ${t.priority === 'P0' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>{t.priority}</span>
                          <span>{t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: In Review */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    👀 In Review ({inReviewMyTasks.length})
                  </h3>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto premium-scrollbar pr-1">
                  {inReviewMyTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-4 text-center">No tasks in review.</p>
                  ) : (
                    inReviewMyTasks.map(t => (
                      <div key={t.id} onClick={() => setSelectedTask(t)} className="p-2 bg-[#1e2025] border border-white/[0.04] rounded-lg hover:border-indigo-500/20 hover:bg-[#25282e] transition cursor-pointer space-y-1">
                        <h4 className="text-[11px] font-bold text-slate-200 line-clamp-1">{t.title}</h4>
                        <div className="flex justify-between items-center text-[8px] text-slate-500">
                          <span className="bg-purple-500/10 text-purple-400 px-1 py-0.5 rounded font-extrabold">{t.priority}</span>
                          <span>{t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 4: Active Backlog */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    ⚙️ Active Backlog ({activeBacklogMyTasks.length})
                  </h3>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto premium-scrollbar pr-1">
                  {activeBacklogMyTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-4 text-center">No active backlog tasks.</p>
                  ) : (
                    activeBacklogMyTasks.map(t => (
                      <div key={t.id} onClick={() => setSelectedTask(t)} className="p-2 bg-[#1e2025] border border-white/[0.04] rounded-lg hover:border-indigo-500/20 hover:bg-[#25282e] transition cursor-pointer space-y-1">
                        <h4 className="text-[11px] font-bold text-slate-200 line-clamp-1">{t.title}</h4>
                        <div className="flex justify-between items-center text-[8px] text-slate-500">
                          <span className="bg-slate-500/10 text-slate-400 px-1 py-0.5 rounded font-extrabold">{t.priority}</span>
                          <span>{t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── CREATE TASK OVERLAY MODAL ────────────────────────────────── */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          config={config}
          onUpdateMetadata={handleUpdateMetadata}
          onClose={() => {
            if (selectedTask && selectedTask.id.startsWith('draft-')) {
              // Re-check sessionStorage to update the banner state
              const keys = Object.keys(sessionStorage);
              const draftKey = keys.find(k => k.startsWith(`devcollab_draft_task_${pid}_`));
              if (draftKey) {
                setHasActiveDraft(true);
                setDraftRecoveryKey(draftKey);
              } else {
                setHasActiveDraft(false);
                setDraftRecoveryKey(null);
              }
            }
            setSelectedTask(null);
          }}
          onSave={async (updates: any) => {
            if (selectedTask.id.startsWith('draft-')) {
              const res = await createTask({
                title: updates.title || 'Untitled Task',
                description: updates.description,
                status: updates.status || 'TODO',
                priority: updates.priority || 'P2',
                dueDate: updates.dueDate === null ? undefined : updates.dueDate,
                projectId: pid!,
                assigneeId: updates.assigneeId || null,
              });

              if (updates.assigneeId) {
                const memberUser = members.find(m => m.userId === updates.assigneeId)?.user;
                if (memberUser) {
                  handleUpdateMetadata(res.id, 'assignees', memberUser);
                }
              }
              if (updates.tags && updates.tags.length > 0) {
                handleUpdateMetadata(res.id, 'tags', updates.tags);
              }
              if (updates.attachments && updates.attachments.length > 0) {
                handleUpdateMetadata(res.id, 'attachments', updates.attachments);
              }
              if (updates.checklist && updates.checklist.length > 0) {
                handleUpdateMetadata(res.id, 'checklists', updates.checklist);
              }

              const draftKey = `devcollab_draft_task_${pid}_${selectedTask.id}`;
              sessionStorage.removeItem(draftKey);
              setHasActiveDraft(false);
              setDraftRecoveryKey(null);

              logActivity(`created task: "${res.title}"`);
              setSelectedTask(res);
              return res;
            } else {
              const res = await updateTask(selectedTask.id, { ...updates, dueDate: updates.dueDate === null ? undefined : updates.dueDate });
              logActivity(`updated task: "${res.title}"`);
              setSelectedTask(res);
              return res;
            }
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

      {/* ─── MANAGE PROJECT MEMBERS MODAL ────────────────────────────────────── */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050607]/80 px-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#17191d] border border-white/[0.04] rounded-2xl p-6 text-white shadow-2xl relative animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <button
              type="button"
              onClick={() => setShowMembersModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-left pb-3 border-b border-white/[0.04] mb-4">
              <h2 className="text-base font-semibold text-white">Manage Project Members</h2>
              <p className="text-xs text-slate-400 mt-1">Assign workspace collaborators to this project stream.</p>
            </div>

            {/* List current project members */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 premium-scrollbar">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block text-left font-mono">Current Members ({activeProjMembers.length})</label>
              
              <div className="space-y-2">
                {activeProjMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.06] transition duration-150">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/[0.04] flex-shrink-0">
                        {member.user.avatar ? (
                          <img src={member.user.avatar} alt={member.user.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          (member.user.name || member.user.email || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-semibold text-white leading-none truncate">{member.user.name || 'Collaborator'}</p>
                        <p className="text-[10px] text-slate-500 mt-1 leading-none truncate">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {getMemberRole(member.userId) === 'Owner' ? 'Owner' : member.role === 'ADMIN' ? 'Lead' : member.role === 'VIEWER' ? 'Viewer' : 'Member'}
                      </span>

                      {/* Role selection dropdown */}
                      {getMemberRole(member.userId) !== 'Owner' && (
                        <select
                          value={member.role}
                          onChange={async (e) => {
                            try {
                              await assignProjectMember(pid!, member.userId, e.target.value as any);
                            } catch (err: any) {
                              alert(`Failed to update project role: ${err.message}`);
                            }
                          }}
                          className="bg-slate-950 border border-white/[0.04] rounded-lg px-2 py-1 text-[10px] text-slate-450 outline-none focus:border-indigo-500/50 transition cursor-pointer font-semibold"
                        >
                          <option value="ADMIN">Lead</option>
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      )}

                      {/* Revoke button */}
                      {member.userId !== user?.id && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Remove ${member.user.name || member.user.email} from this project?`)) {
                              try {
                                await removeProjectMember(pid!, member.userId);
                              } catch (err: any) {
                                alert(`Failed to remove member: ${err.message}`);
                              }
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-rose-450 transition"
                          title="Revoke project access"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add workspace member to project section */}
              <div className="pt-4 border-t border-white/[0.04] space-y-3.5 text-left">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block font-mono">Assign Member</label>
                
                {(() => {
                  const unassignedWorkspaceMembers = members.filter(
                    (wm) => !activeProjMembers.some((pm) => pm.userId === wm.userId)
                  );

                  if (unassignedWorkspaceMembers.length === 0) {
                    return (
                      <p className="text-[11px] text-slate-500">No members available in this workspace. If any peoples are joined in the workspace it will display here and allow to assign with specific role.</p>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={selectedWorkspaceMemberId}
                          onChange={(e) => setSelectedWorkspaceMemberId(e.target.value)}
                          className="w-full bg-slate-950 border border-white/[0.04] rounded-xl px-3 py-2.5 text-xs text-slate-350 outline-none focus:border-indigo-500/50 transition font-semibold"
                        >
                          <option value="">Select a workspace collaborator...</option>
                          {unassignedWorkspaceMembers.map((wm) => (
                            <option key={wm.userId} value={wm.userId}>
                              {wm.user.name || wm.user.email} ({wm.user.email})
                            </option>
                          ))}
                        </select>

                        <select
                          value={selectedProjectRole}
                          onChange={(e) => setSelectedProjectRole(e.target.value as any)}
                          className="w-full bg-slate-950 border border-white/[0.04] rounded-xl px-3 py-2.5 text-xs text-slate-350 outline-none focus:border-indigo-500/50 transition font-semibold"
                        >
                          <option value="MEMBER">Project Member</option>
                          <option value="ADMIN">Project Lead / Admin</option>
                          <option value="VIEWER">Project Viewer</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!selectedWorkspaceMemberId) return;
                          try {
                            await assignProjectMember(pid!, selectedWorkspaceMemberId, selectedProjectRole);
                            setSelectedWorkspaceMemberId('');
                          } catch (err: any) {
                            alert(`Failed to assign member: ${err.message}`);
                          }
                        }}
                        disabled={!selectedWorkspaceMemberId}
                        className="w-full py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 disabled:pointer-events-none transition text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Assign to Project</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="border-t border-white/[0.04] pt-4 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold hover:bg-slate-900 transition text-slate-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

