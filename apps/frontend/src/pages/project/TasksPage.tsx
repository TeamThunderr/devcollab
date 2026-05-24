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
  const { workspaceId, workspaceSlug, pid = 'project-test-456' } = useParams<{ workspaceId?: string; workspaceSlug?: string; pid?: string }>();
  const activeWorkspaceId = workspaceId || workspaceSlug || 'default-workspace';
  const navigate = useNavigate();

  const { tasks, fetchTasksByProject, createTask, updateTask, deleteTask, addComment } = useTaskStore();
  const { projects, fetchProjects, createProject, deleteProject } = useProjectStore();
  const { members: workspaceMembers, fetchWorkspaceDetails } = useWorkspaceStore();
  const { user: currentUser } = useAuthStore();
  const { subscription, fetchSubscription, upgradeToPro } = useBillingStore();

  // Project Mapping Layer to prevent fastify parameter validation crash (expects UUID)
  const activeProjectId = useMemo(() => {
    if (pid === 'project-test-456' && projects.length > 0) {
      return projects[0].id;
    }
    return pid === 'project-test-456' || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(pid)
      ? '00000000-0000-0000-0000-000000000456'
      : pid;
  }, [pid, projects]);

  const [config, setConfig] = useState<ProjectWorkspaceConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'sprints' | 'analytics' | 'activity' | 'ai'>('dashboard');
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
    const nextStatus = (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(overId) ? overId : 'TODO') as TaskStatus;
    
    if (activeTask.status !== nextStatus) {
      // Apply Optimistic drag update
      setLocalTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: nextStatus } : t));
      logActivity(`moved task "${activeTask.title}" to ${nextStatus}`);

      void updateTask(activeTask.id, { status: nextStatus }).catch(() => {
        // Rollback state
        setLocalTasks(tasks);
        alert("Failed to synchronize task move. State reverted.");
      });
    }
  };

  const handleRenameColumn = (colId: string, newTitle: string) => {
    if (!canManageBoard) return;
    updateProjectConfig(prev => ({ ...prev, columns: prev.columns.map(c => c.id === colId ? { ...c, title: newTitle } : c) }));
    logActivity(`renamed column "${colId}" to "${newTitle}"`);
  };

  const handleMoveColumn = (colId: string, direction: 'left' | 'right') => {
    if (!canManageBoard) return;
    updateProjectConfig(prev => {
      const idx = prev.columns.findIndex(c => c.id === colId);
      const target = direction === 'left' ? idx - 1 : idx + 1;
      if (target >= 0 && target < prev.columns.length) {
        const next = [...prev.columns];
        const temp = next[idx]; next[idx] = next[target]; next[target] = temp;
        return { ...prev, columns: next };
      }
      return prev;
    });
  };

  const handleDeleteColumn = (colId: string) => {
    if (!canManageBoard) return;
    updateProjectConfig(prev => ({ ...prev, columns: prev.columns.filter(c => c.id !== colId) }));
    logActivity(`deleted column "${colId}"`);
  };

  const handleCreateSprint = () => {
    if (!sprintName.trim() || !config || !canCreateSprint) return;
    const newSprint = {
      id: `spr-${Date.now()}`,
      name: sprintName.trim(),
      goal: sprintGoal.trim(),
      status: 'upcoming' as const,
      taskIds: [],
    };
    updateProjectConfig(prev => ({ ...prev, sprints: [...(prev.sprints || []), newSprint] }));
    logActivity(`created sprint: "${sprintName.trim()}"`);
    setSprintName(''); setSprintGoal(''); setShowSprintForm(false);
  };

  const handleActivateSprint = (sid: string) => {
    updateProjectConfig(prev => ({
      ...prev,
      sprints: (prev.sprints || []).map(s => ({ ...s, status: s.id === sid ? 'active' : s.status === 'active' ? 'completed' : s.status }))
    }));
    logActivity(`activated sprint`);
  };

  const handleCompleteSprint = (sid: string) => {
    updateProjectConfig(prev => ({
      ...prev,
      sprints: (prev.sprints || []).map(s => s.id === sid ? { ...s, status: 'completed' as const } : s)
    }));
    logActivity(`completed sprint`);
  };

  const handleGenerateAISuggestions = () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setTimeout(() => {
      setAiSuggestions([
        { title: `Design modular context adapters for ${aiPrompt.trim()}`, description: `Establish dynamic custom stores and context providers.`, priority: 'P1' },
        { title: `Initialize real-time state synchronization for ${aiPrompt.trim()}`, description: `Hook Socket.IO broadcasters into local state queues.`, priority: 'P0' },
        { title: `Create responsive layout benchmarks for ${aiPrompt.trim()}`, description: `Verify viewport constraints on tablet and mobile resolutions.`, priority: 'P2' },
      ]);
      setAiLoading(false);
    }, 800);
  };

  const handleAddAISuggestionToBoard = async (sug: typeof aiSuggestions[number]) => {
    if (!canCreateTask || !activeProjectId) return;
    const added = await createTask({
      title: sug.title,
      description: sug.description,
      status: 'TODO',
      priority: sug.priority,
      projectId: activeProjectId,
    });
    setLocalTasks(prev => [added, ...prev]);
    logActivity(`created task from AI: "${sug.title}"`);
    alert(`Added task "${sug.title}" to board!`);
  };

  const handleMarkAllNotificationsRead = () => {
    updateProjectConfig(prev => ({
      ...prev,
      notifications: (prev.notifications || []).map(n => ({ ...n, read: true }))
    }));
  };

  const handleResetWorkspaceConfig = () => {
    if (window.confirm('Wipe project configuration and re-run onboarding flow?')) {
      localStorage.removeItem(`devcollab_project_workspace_${activeProjectId}`);
      setConfig(null);
      setWizardStep(1);
    }
  };

  // Toggle Project Favorites
  const toggleStarProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = starredProjects.includes(projectId)
      ? starredProjects.filter(id => id !== projectId)
      : [...starredProjects, projectId];
    setStarredProjects(next);
    localStorage.setItem(`devcollab_starred_projects_${activeWorkspaceId}`, JSON.stringify(next));
  };

  // Toggle Project Pinned
  const togglePinProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = pinnedProjects.includes(projectId)
      ? pinnedProjects.filter(id => id !== projectId)
      : [...pinnedProjects, projectId];
    setPinnedProjects(next);
    localStorage.setItem(`devcollab_pinned_projects_${activeWorkspaceId}`, JSON.stringify(next));
  };

  // Premium onboarding launching sequence with full compiling progress
  const handleLaunchProject = async () => {
    const totalProjects = projects.length;
    const isPro = subscription?.plan === 'PRO';

    // Limit free tier to 5 projects
    if (totalProjects >= 5 && !isPro) {
      setShowUpgradeModal(true);
      return;
    }

    setIsCompiling(true);
    setCompilingProgress(5);
    setCompilingStatusText('Bootstrapping modular workspace environment...');

    const statuses = [
      { p: 20, t: 'Connecting postgres schema tables...' },
      { p: 45, t: `Compiling custom ${onboardingAnswers.workflow || 'Kanban'} workflow rules...` },
      { p: 70, t: `Applying visual layout themes for ${onboardingAnswers.style || 'Minimal'} deck...` },
      { p: 90, t: 'Syncing project workspace presence listeners...' },
      { p: 100, t: 'Workspace active! Ready for delivery...' }
    ];

    let currentIdx = 0;
    const compileInterval = setInterval(async () => {
      if (currentIdx < statuses.length) {
        setCompilingProgress(statuses[currentIdx].p);
        setCompilingStatusText(statuses[currentIdx].t);
        currentIdx++;
      } else {
        clearInterval(compileInterval);
        
        // Save to real database
        const name = `My ${onboardingAnswers.buildType || 'SaaS'} ${onboardingAnswers.workflow || 'Kanban'}`;
        const description = `A premium workspace structured around ${onboardingAnswers.workflow || 'Kanban'} workflow optimization. Style: ${onboardingAnswers.style || 'Minimal'}.`;

        try {
          const created = await createProject({
            name,
            description,
            workspaceId: activeWorkspaceId,
          });

          const newConfig: ProjectWorkspaceConfig = {
            name,
            description,
            projectType: onboardingAnswers.buildType || 'Software Engineering',
            visibility: 'Public to Workspace',
            members: [{ userId: currentUser?.id || 'default', role: 'Owner' }],
            permissions: DEFAULT_PERMISSIONS,
            columns: onboardingAnswers.workflow === 'Simple Tasks' ? [
              { id: 'TODO', title: 'To Do' },
              { id: 'DONE', title: 'Completed' }
            ] : DEFAULT_COLUMNS,
            sprints: [],
            activities: [{ id: `act-${Date.now()}`, userName: currentUser?.name || 'Owner', details: 'created this project workspace', timestamp: new Date().toISOString() }],
            notifications: [{ id: `notif-${Date.now()}`, message: `🚀 Welcome to the new premium project workspace "${name}"!`, read: false, timestamp: new Date().toISOString() }],
          };

          localStorage.setItem(`devcollab_project_workspace_${created.id}`, JSON.stringify(newConfig));
          setConfig(newConfig);

          // Complete syncing reset
          setIsCompiling(false);
          setShowCreateModal(false);
          setOnboardingAnswers({ buildType: '', teamSize: '', priority: '', workflow: '', style: '' });
          setWizardStep(1);
          navigate(`/${activeWorkspaceId}/projects/${created.id}`);
        } catch (err: any) {
          setIsCompiling(false);
          alert(`Error creating project: ${err.message}`);
        }
      }
    }, 450);
  };

  const handleProUpgradeSubmit = async () => {
    if (currentUser) {
      await upgradeToPro(activeWorkspaceId, currentUser.email, currentUser.name ?? undefined);
      setShowUpgradeModal(false);
    }
  };

  // ─── PREMIUM INITIALIZING LOADER ──────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-white premium-font z-50 transition-all duration-300">
        <div className="w-full max-w-sm space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 via-violet-650 to-cyan-400 rounded-2xl flex items-center justify-center shadow-xl ring-4 ring-indigo-950/50 animate-pulse">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Initializing Project Workspace</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Syncing presence boards & visuals...</p>
          </div>
          <div className="space-y-2">
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 rounded-full transition-all duration-350 ease-out" 
                style={{ width: `${initProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold font-mono text-slate-600 px-1">
              <span>Syncing Decks</span>
              <span>{initProgress}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── WIZARD COMPILING / SYNC SCREEN ──────────────────────────────────────────
  if (isCompiling) {
    return (
      <div className="absolute inset-0 bg-slate-950 flex items-center justify-center p-6 text-white premium-font z-50">
        <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl text-center space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-indigo-600/10 rounded-full border border-indigo-500/30 flex items-center justify-center">
              <Zap className="h-6 w-6 text-indigo-400 animate-bounce" />
            </div>
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-lg font-bold">Compiling Workspace</h2>
            <p className="text-xs text-slate-400 h-4 transition-all duration-200">{compilingStatusText}</p>
          </div>
          <div className="space-y-2">
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${compilingProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] font-bold text-slate-500 font-mono">
              <span>Configuring Pipelines</span>
              <span>{compilingProgress}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper render for step visual components inside wizards
  const renderWizardContent = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4 animate-slide-in-right text-left">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">What are you planning to build?</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { type: 'SaaS Platform', icon: '🚀', desc: 'Subscription platform' },
                { type: 'AI Product', icon: '🧠', desc: 'Neural app models' },
                { type: 'ERP System', icon: '📊', desc: 'Resource workflows' },
                { type: 'Mobile App', icon: '📱', desc: 'Android & iOS cycles' },
                { type: 'Portfolio', icon: '🎨', desc: 'Creative highlights' },
                { type: 'Startup MVP', icon: '💎', desc: 'Agile MVP pipeline' },
                { type: 'Team Workspace', icon: '👥', desc: 'Multi-member board' },
                { type: 'Other', icon: '⚙️', desc: 'Custom workspace queue' },
              ].map(opt => {
                const selected = onboardingAnswers.buildType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setOnboardingAnswers({ ...onboardingAnswers, buildType: opt.type })}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 relative group overflow-hidden ${
                      selected 
                        ? 'bg-indigo-600/10 border-indigo-500 shadow-indigo-500/10 dark:shadow-indigo-500/20' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{opt.icon}</span>
                    <div className="mt-2">
                      <p className="text-[11px] font-bold text-white leading-tight">{opt.type}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5 leading-none">{opt.desc}</p>
                    </div>
                    {selected && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 border border-indigo-400 flex items-center justify-center text-[9px] font-extrabold text-white animate-in zoom-in-50">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-slide-in-right text-left">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">How big is your team?</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { size: 'Solo', label: '👤 Just Me', desc: 'Single-member timelines and private workspaces.' },
                { size: '2–5 Members', label: '👥 Small Team', desc: 'Direct agile flows, comments and shared boards.' },
                { size: '5–15 Members', label: '🏢 Growing Core', desc: 'Sprint planning metrics, workload charts, and role allocations.' },
                { size: 'Enterprise Team', label: '👑 Scale Suite', desc: 'Granular workspace permissions, security logs & capacity analysis.' },
              ].map(opt => {
                const selected = onboardingAnswers.teamSize === opt.size;
                return (
                  <button
                    key={opt.size}
                    type="button"
                    onClick={() => setOnboardingAnswers({ ...onboardingAnswers, teamSize: opt.size })}
                    className={`p-5 rounded-2xl border text-left space-y-2 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 relative ${
                      selected 
                        ? 'bg-indigo-600/10 border-indigo-500 shadow-indigo-500/10' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">{opt.label}</p>
                    <p className="text-[10px] text-slate-450 leading-relaxed">{opt.desc}</p>
                    {selected && (
                      <span className="absolute top-3 right-3 w-4.5 h-4.5 rounded-full bg-indigo-500 border border-indigo-400 flex items-center justify-center text-[9px] font-extrabold text-white animate-in zoom-in-50">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-slide-in-right text-left">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">What matters most?</h3>
            <div className="grid grid-cols-5 gap-2.5">
              {[
                { key: 'Speed', label: 'Velocity', desc: 'Rapid delivery cycles', icon: <Zap className="h-5 w-5 text-amber-400" /> },
                { key: 'Collaboration', label: 'Synergy', desc: 'Shared task reviews', icon: <Users className="h-5 w-5 text-indigo-400" /> },
                { key: 'Client Delivery', label: 'Milestones', desc: 'Due date calendars', icon: <Briefcase className="h-5 w-5 text-emerald-450" /> },
                { key: 'Product Tracking', label: 'Scopes', desc: 'Strategic roadmaps', icon: <Compass className="h-5 w-5 text-cyan-400" /> },
                { key: 'Sprint Workflow', label: 'Sprints', desc: 'Sprint planners', icon: <Layers className="h-5 w-5 text-pink-400" /> },
              ].map(opt => {
                const selected = onboardingAnswers.priority === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setOnboardingAnswers({ ...onboardingAnswers, priority: opt.key })}
                    className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-3 transition-all duration-300 min-h-[145px] relative ${
                      selected 
                        ? 'bg-indigo-600/10 border-indigo-500 shadow-indigo-500/10 scale-[1.02]' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <span className="p-2 bg-slate-900 rounded-xl border border-slate-800">{opt.icon}</span>
                    <div className="text-center space-y-0.5">
                      <p className="text-[10px] font-bold text-white">{opt.label}</p>
                      <p className="text-[8px] text-slate-500 leading-normal">{opt.desc}</p>
                    </div>
                    {selected && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 border border-indigo-400 flex items-center justify-center text-[9px] font-extrabold text-white animate-in zoom-in-50">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 animate-slide-in-right text-left">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">What workflow fits your team?</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'Agile Sprint', label: '🏃 Agile Sprint', desc: 'Divide deliverables into iterative sprints with a dedicated Product Backlog queue.' },
                { key: 'Kanban', label: '📋 Kanban Board', desc: 'Classic 4-lane pipeline flow: To Do, In Progress, In Review, and Completed.' },
                { key: 'Product Roadmap', label: '🗺️ Product Roadmap', desc: 'Timeline-centric deliverable milestones and strategic release boards.' },
                { key: 'Simple Tasks', label: '✅ Simple Tasks', desc: 'Minimalist 2-lane workflow (To Do and Completed) for rapid pipelines.' },
              ].map(opt => {
                const selected = onboardingAnswers.workflow === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setOnboardingAnswers({ ...onboardingAnswers, workflow: opt.key })}
                    className={`p-4 rounded-2xl border text-left space-y-1.5 transition-all duration-300 relative ${
                      selected 
                        ? 'bg-indigo-600/10 border-indigo-500 shadow-indigo-500/10 scale-[1.01]' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold text-white">{opt.label}</p>
                    <p className="text-[10px] text-slate-450 leading-relaxed">{opt.desc}</p>
                    {selected && (
                      <span className="absolute top-3 right-3 w-4.5 h-4.5 rounded-full bg-indigo-500 border border-indigo-400 flex items-center justify-center text-[9px] font-extrabold text-white animate-in zoom-in-50">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4 animate-slide-in-right text-left">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Choose your workspace style</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { style: 'Minimal', label: '⚪ Minimalist', desc: 'Ultra clean design. Thin border glass headers with minimal visual distraction.' },
                { style: 'Professional', label: '💼 Professional', desc: 'Structured grid workspaces, clean layouts, and detailed logs.' },
                { style: 'Creative', label: '🎨 Creative Glow', desc: 'Dynamic visual design featuring vibrant card shadow glows, transforms, and gradients.' },
                { style: 'Enterprise', label: '🏢 Enterprise Bold', desc: 'Denser typography weights, prominent status indicators, and large text scales.' },
              ].map(opt => {
                const selected = onboardingAnswers.style === opt.style;
                return (
                  <button
                    key={opt.style}
                    type="button"
                    onClick={() => setOnboardingAnswers({ ...onboardingAnswers, style: opt.style })}
                    className={`p-4 rounded-2xl border text-left space-y-1.5 transition-all duration-300 relative ${
                      selected 
                        ? 'bg-indigo-600/10 border-indigo-500 shadow-indigo-500/10 scale-[1.01]' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold text-white">{opt.label}</p>
                    <p className="text-[10px] text-slate-450 leading-relaxed">{opt.desc}</p>
                    {selected && (
                      <span className="absolute top-3 right-3 w-4.5 h-4.5 rounded-full bg-indigo-500 border border-indigo-400 flex items-center justify-center text-[9px] font-extrabold text-white animate-in zoom-in-50">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // ─── FULL PANEL ONBOARDING FLOW (No database projects exist) ────────────────
  if (projects.length === 0) {
    return (
      <div className="absolute inset-0 bg-slate-950 flex items-center justify-center p-6 text-white premium-font z-40 overflow-y-auto">
        <div className="w-full max-w-4xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[580px] animate-in fade-in duration-405">
          {/* Left panel */}
          <aside className="w-full md:w-72 bg-slate-950/60 p-8 border-b md:border-b-0 md:border-r border-slate-850/80 flex flex-col justify-between text-left">
            <div className="space-y-8">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400">Workspace Deck</span>
                <h1 className="text-xl font-extrabold text-white mt-1">Project Wizard</h1>
              </div>
              <ul className="space-y-4">
                {[
                  { step: 1, label: 'Platform Intent', desc: 'Core product intent' },
                  { step: 2, label: 'Team Size', desc: 'Workload scale metrics' },
                  { step: 3, label: 'Delivery Focus', desc: 'Priority deck target' },
                  { step: 4, label: 'Workflow setup', desc: 'System board status lanes' },
                  { step: 5, label: 'Visual style', desc: 'Workspace layout theme' },
                ].map((s) => {
                  const active = wizardStep === s.step;
                  const completed = wizardStep > s.step;
                  return (
                    <li key={s.step} className="flex gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 ring-4 ring-indigo-950' : 
                        completed ? 'bg-indigo-950 text-indigo-400 border border-indigo-500/30' : 'bg-slate-900 text-slate-600 border border-slate-850'
                      }`}>
                        {completed ? '✓' : s.step}
                      </span>
                      <div>
                        <p className={`text-xs font-bold leading-tight ${active ? 'text-white' : 'text-slate-550'}`}>{s.label}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 leading-none">{s.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal border-t border-slate-850 pt-4">Configure your delivery streams with customized workflows in clicks.</p>
          </aside>

          {/* Wizard Main content */}
          <main className="flex-1 p-8 flex flex-col justify-between min-h-[480px]">
            <div className="flex-1 flex flex-col justify-center min-h-[340px]">
              {renderWizardContent()}
            </div>

            {/* Wizard controls */}
            <div className="flex justify-between items-center mt-8 border-t border-slate-800/80 pt-5">
              <button 
                type="button" 
                onClick={() => setWizardStep(prev => prev - 1)} 
                disabled={wizardStep === 1} 
                className="rounded-xl border border-slate-705 px-4.5 py-2 text-xs font-semibold text-slate-350 hover:bg-slate-900 disabled:opacity-40 disabled:pointer-events-none transition"
              >
                ← Back
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
                  className="rounded-xl bg-indigo-650 px-5.5 py-2.5 text-xs font-bold text-white hover:bg-indigo-550 disabled:opacity-40 disabled:pointer-events-none transition shadow-lg shadow-indigo-600/10"
                >
                  Continue →
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={() => void handleLaunchProject()} 
                  disabled={!onboardingAnswers.style}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-650 px-6.5 py-2.5 text-xs font-extrabold text-white hover:opacity-95 shadow-lg shadow-indigo-500/15 ring-2 ring-indigo-950 transition"
                >
                  🚀 Compile Project Workspace
                </button>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ─── PREMIUM SHELL WITH NAVIGATION ──────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-805 dark:text-slate-100 premium-font overflow-hidden">
      
      {/* ─── NEW MINIMAL PREMIUM TOPBAR ────────────────────────────────────────── */}
      <header className="px-6 py-3.5 border-b border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-between gap-4 flex-shrink-0 z-20 shadow-sm transition-all duration-200">
        
        {/* WorkspaceSwitcher / Project selector dropdown */}
        <div className="flex items-center gap-2 relative">
          <button 
            type="button" 
            onClick={() => setShowProjectSwitcher(!showProjectSwitcher)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-205 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white transition-all shadow-sm"
          >
            <Layout className="h-4 w-4 text-indigo-500" />
            <span className="truncate max-w-[130px] font-semibold">{activeProjectObject?.name || 'Select Project'}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-450" />
          </button>

          {showProjectSwitcher && (
            <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 shadow-2xl p-3.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
              <div className="px-1.5 pb-2 mb-2 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                <span>Projects</span>
                <button type="button" onClick={() => { setShowCreateModal(true); setShowProjectSwitcher(false); }} className="text-indigo-550 dark:text-indigo-400 font-bold hover:underline">Add Project</button>
              </div>
              
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1 premium-scrollbar">
                {projects.map((proj) => {
                  const isStarred = starredProjects.includes(proj.id);
                  const isPinned = pinnedProjects.includes(proj.id);
                  const isSelected = proj.id === activeProjectId;

                  return (
                    <div 
                      key={proj.id}
                      onClick={() => { navigate(`/${activeWorkspaceId}/projects/${proj.id}`); setShowProjectSwitcher(false); }}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10' 
                          : 'text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <span className="truncate flex-1 text-left">{proj.name}</span>
                      <div className="flex items-center gap-1 ml-2">
                        <button 
                          type="button" 
                          onClick={(e) => toggleStarProject(proj.id, e)} 
                          className={`p-1 rounded text-xs transition ${
                            isStarred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-300'
                          }`}
                          title="Star Project"
                        >
                          ★
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => togglePinProject(proj.id, e)} 
                          className={`p-1 rounded text-xs transition ${
                            isPinned ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-300'
                          }`}
                          title="Pin Project"
                        >
                          📌
                        </button>
                        {projects.length > 1 && (
                          <button 
                            type="button" 
                            onClick={async (e) => { 
                              e.stopPropagation(); 
                              if (window.confirm('Delete this project?')) {
                                await deleteProject(proj.id);
                                localStorage.removeItem(`devcollab_project_workspace_${proj.id}`);
                              } 
                            }} 
                            className="p-1 rounded text-xs text-slate-400 hover:text-red-500 transition"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Minimal Search Input */}
        <div className="relative flex-1 max-w-sm hidden sm:block">
          <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500"><Search className="h-3.5 w-3.5" /></span>
          <input 
            type="text" 
            placeholder="Search board tasks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-850 dark:text-slate-200 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition-all shadow-inner"
          />
        </div>

        {/* Stacked Avatars Group, notifications, reset, buttons */}
        <div className="flex items-center gap-3">
          {/* Overlapping User Avatars stacked group */}
          <div className="flex -space-x-1.5 items-center">
            {workspaceMembers.slice(0, 3).map((m, idx) => {
              const initial = (m.user?.name || m.user?.email || '?').charAt(0).toUpperCase();
              return (
                <div 
                  key={m.userId}
                  className={`w-6 h-6 rounded-full border border-white dark:border-slate-950 flex items-center justify-center text-[9px] font-bold text-white shadow-sm cursor-help relative group/av`}
                  style={{ backgroundColor: idx === 0 ? '#4f46e5' : idx === 1 ? '#0d9488' : '#0891b2', zIndex: 10 - idx }}
                >
                  {initial}
                  <span className="absolute top-full right-1/2 translate-x-1/2 mt-1 hidden group-hover/av:block bg-slate-950 text-white text-[8px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-30 font-sans">
                    {m.user?.name || m.user?.email}
                  </span>
                </div>
              );
            })}
            {workspaceMembers.length > 3 && (
              <div className="w-6 h-6 rounded-full border border-white dark:border-slate-950 bg-slate-800 text-white flex items-center justify-center text-[9px] font-bold z-[5]">
                +{workspaceMembers.length - 3}
              </div>
            )}
          </div>

          {/* Notifications Drawer */}
          <div className="relative">
            <button 
              type="button" 
              onClick={() => { setShowNotifications(!showNotifications); handleMarkAllNotificationsRead(); }} 
              className="p-1.5 rounded-xl border border-slate-205 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs relative flex items-center justify-center transition-all shadow-sm"
            >
              <Bell className="h-4 w-4 text-slate-600 dark:text-slate-450" />
              {(config?.notifications || []).some(n => !n.read) && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 shadow-2xl p-4 z-30 animate-in fade-in duration-100 text-left">
                <div className="flex justify-between border-b dark:border-slate-850 pb-2 mb-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  <span>Recent Alerts</span>
                  <button type="button" onClick={() => setShowNotifications(false)} className="text-slate-450 hover:text-slate-600">✕</button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto text-[10px] pr-1 premium-scrollbar">
                  {config?.notifications?.length === 0 ? <p className="text-slate-450 italic text-center py-4">No recent alerts.</p> :
                    config?.notifications?.map(n => (
                      <div key={n.id} className="p-2 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 leading-relaxed text-slate-700 dark:text-slate-350">
                        {n.message}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          {/* Reset Workspace button */}
          <button 
            type="button" 
            onClick={handleResetWorkspaceConfig}
            className="p-1.5 rounded-xl border border-slate-205 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 text-xs transition shadow-sm"
            title="Reset Project Config (Wizard test)"
          >
            <Settings2 className="h-4 w-4 text-slate-500" />
          </button>

          {/* Action buttons */}
          <button 
            type="button" 
            onClick={() => setShowCreateModal(true)} 
            className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 px-3.5 py-1.5 text-xs font-bold transition shadow-sm hidden md:flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Project
          </button>

          {canCreateTask && (
            <button 
              type="button" 
              onClick={() => setShowTaskForm(true)} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition shadow-md shadow-indigo-600/10 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Task
            </button>
          )}
        </div>
      </header>

      {/* ─── MODERN MINIMALIST TAB SWITCHER ────────────────────────────────────────── */}
      <nav className="px-6 py-1.5 border-b border-slate-205 dark:border-slate-900 bg-white dark:bg-slate-950/20 flex gap-1 flex-shrink-0 z-10 overflow-x-auto">
        {[
          { tab: 'dashboard', label: '🏠 Dashboard' },
          { tab: 'board', label: '📋 Kanban Board' },
          { tab: 'sprints', label: '🏃 Sprints' },
          { tab: 'analytics', label: '📊 Analytics' },
          { tab: 'activity', label: '🕒 Audit Feed' },
          { tab: 'ai', label: '🤖 AI suggestion' },
        ].map(t => {
          const isActive = activeTab === t.tab;
          return (
            <button 
              key={t.tab} 
              type="button" 
              onClick={() => setActiveTab(t.tab as any)} 
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm scale-[1.01]' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Scrollable Container Body */}
      <main className={`flex-1 min-w-0 bg-slate-50/50 dark:bg-slate-950/20 ${activeTab === 'board' ? 'overflow-hidden flex flex-col p-6 h-full' : 'overflow-y-auto p-6'}`}>
        
        {/* Gorgeous Backdrop Floating creation task modal overlay */}
        {showTaskForm && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 text-left">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Create Project Task</h2>
                <button type="button" onClick={() => setShowTaskForm(false)} className="text-slate-450 hover:text-slate-650 transition">✕</button>
              </div>

              <div className="grid gap-4 text-xs">
                <label className="block font-bold text-slate-500">Task Title
                  <input 
                    type="text" 
                    value={taskTitle} 
                    onChange={e => setTaskTitle(e.target.value)} 
                    className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition" 
                    placeholder="e.g. Build client adapter authentication fallback..." 
                  />
                </label>

                <label className="block font-bold text-slate-500">Task Description
                  <textarea 
                    value={taskDesc} 
                    onChange={e => setTaskDesc(e.target.value)} 
                    className="w-full mt-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none resize-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 transition" 
                    placeholder="Detailed task goals and deliverables criteria..." 
                    rows={3} 
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <div className="block font-bold text-slate-500">Priority Level
                    <div className="flex gap-1.5 mt-1.5">
                      {[
                        { level: 'P0', label: 'Critical', color: 'border-rose-500/30 text-rose-600 bg-rose-500/5', activeColor: 'bg-rose-500 text-white border-rose-500' },
                        { level: 'P1', label: 'High', color: 'border-amber-500/30 text-amber-600 bg-amber-500/5', activeColor: 'bg-amber-500 text-white border-amber-500' },
                        { level: 'P2', label: 'Normal', color: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5', activeColor: 'bg-emerald-500 text-white border-emerald-500' },
                      ].map(p => {
                        const isSel = taskPrio === p.level;
                        return (
                          <button
                            key={p.level}
                            type="button"
                            onClick={() => setTaskPrio(p.level as TaskPriority)}
                            className={`flex-1 py-2 border rounded-xl font-bold text-center transition ${isSel ? p.activeColor : `${p.color} hover:opacity-80`}`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block font-bold text-slate-500">Due Date
                    <div className="mt-1.5">
                      <DatePicker date={taskDue} setDate={setTaskDue} placeholder="Choose deadline" />
                    </div>
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <button type="button" onClick={() => setShowTaskForm(false)} className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 font-bold hover:bg-slate-50 dark:hover:bg-slate-905 transition">Cancel</button>
                  <button 
                    type="button" 
                    onClick={() => void handleCreateTaskSubmit()} 
                    disabled={!taskTitle.trim()} 
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5.5 py-2.5 font-extrabold disabled:opacity-40 transition shadow-lg shadow-indigo-600/10"
                  >
                    🚀 Create Instant Task
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ─── TAB 0: DASHBOARD OVERVIEW ─────────────────────────────────────────── */}
        {activeTab === 'dashboard' && config && (
          <div className="space-y-6 max-w-5xl animate-in fade-in duration-300">
            {/* Premium welcome header card */}
            <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-7 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden border border-slate-850/80">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="text-left space-y-1 z-10">
                <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-indigo-400 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Workspace summary</span>
                <h2 className="text-2xl font-extrabold tracking-tight">Welcome back, {currentUser?.name || 'Builder'}!</h2>
                <p className="text-xs text-slate-400">Let's ship some code today. You are viewing the <span className="font-bold text-indigo-300">"{config.name}"</span> dashboard.</p>
              </div>
              <div className="flex gap-3 z-10">
                <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/40 text-center min-w-20">
                  <span className="text-[9px] uppercase font-bold text-slate-500">Tasks</span>
                  <p className="text-lg font-bold text-indigo-400">{localTasks.length}</p>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/40 text-center min-w-20">
                  <span className="text-[9px] uppercase font-bold text-slate-500">Done</span>
                  <p className="text-lg font-bold text-emerald-400">{localTasks.filter(t => t.status === 'DONE').length}</p>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/40 text-center min-w-20">
                  <span className="text-[9px] uppercase font-bold text-slate-500">Sprints</span>
                  <p className="text-lg font-bold text-cyan-400">{config.sprints?.length || 0}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {/* Sprint Progress widget */}
              <div className="border border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md p-6 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"><PlayCircle className="h-4 w-4 text-indigo-500" /> Active Progress</h3>
                  <p className="text-[10px] text-slate-450 mt-1">Completion rate of active sprint subtasks.</p>
                </div>
                <div className="py-2 flex items-center justify-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-slate-100 dark:text-slate-900" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-indigo-550 transition-all duration-500" strokeDasharray={`${localTasks.length ? Math.round((localTasks.filter(t => t.status === 'DONE').length / localTasks.length) * 100) : 0}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span className="absolute text-sm font-extrabold text-slate-800 dark:text-white">
                      {localTasks.length ? Math.round((localTasks.filter(t => t.status === 'DONE').length / localTasks.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-500 text-center">
                  {localTasks.filter(t => t.status === 'DONE').length} of {localTasks.length} tasks completed
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="border border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md p-6 rounded-3xl shadow-sm space-y-3 md:col-span-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"><Clock className="h-4 w-4 text-indigo-500" /> Upcoming Deadlines</h3>
                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 premium-scrollbar">
                  {localTasks.filter(t => t.dueDate && t.status !== 'DONE').length === 0 ? (
                    <div className="text-center py-8 text-slate-450 italic text-[11px]">No urgent deadlines scheduled.</div>
                  ) : (
                    localTasks.filter(t => t.dueDate && t.status !== 'DONE').slice(0, 3).map(task => {
                      const overdue = new Date(task.dueDate!) < new Date();
                      return (
                        <div key={task.id} className="flex justify-between items-center p-2.5 border border-slate-100 dark:border-slate-900/60 rounded-xl bg-slate-50/50 dark:bg-slate-900/25 text-xs hover:scale-[1.01] transition-transform">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">{task.title}</span>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border ${
                            overdue 
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 border-rose-100 dark:border-rose-955' 
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-955/20 border-amber-100'
                          }`}>
                            {new Date(task.dueDate!).toLocaleDateString()} {overdue && '(Overdue)'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Productivity Insights */}
              <div className="border border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md p-6 rounded-3xl shadow-sm space-y-4 md:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-650 dark:text-indigo-400 flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-indigo-500" /> Productivity Insights</h3>
                  <p className="text-[10px] text-slate-455 mt-0.5">Priority and delivery load distribution metrics.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-rose-500 uppercase tracking-wider">Critical (P0)</span>
                      <span className="text-slate-500">{localTasks.filter(t => t.priority === 'P0').length} Tasks</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${localTasks.length ? (localTasks.filter(t => t.priority === 'P0').length / localTasks.length) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-amber-500 uppercase tracking-wider">High (P1)</span>
                      <span className="text-slate-500">{localTasks.filter(t => t.priority === 'P1').length} Tasks</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${localTasks.length ? (localTasks.filter(t => t.priority === 'P1').length / localTasks.length) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="border border-slate-205 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md p-6 rounded-3xl shadow-sm space-y-3 flex flex-col justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <button type="button" onClick={() => setShowTaskForm(true)} className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 font-extrabold rounded-2xl border border-indigo-100 dark:border-indigo-900/30 hover:scale-[1.02] transition-transform">Create Task</button>
                  <button type="button" onClick={() => setActiveTab('sprints')} className="p-3 bg-pink-50 dark:bg-pink-950/20 text-pink-700 dark:text-pink-300 font-extrabold rounded-2xl border border-pink-100 dark:border-pink-900/30 hover:scale-[1.02] transition-transform">Plan Sprint</button>
                  <button type="button" onClick={() => setActiveTab('ai')} className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 font-extrabold rounded-2xl border border-purple-100 dark:border-purple-900/30 hover:scale-[1.02] transition-transform">Ask AI</button>
                  <button type="button" onClick={() => setActiveTab('board')} className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-extrabold rounded-2xl border border-emerald-100 dark:border-emerald-900/30 hover:scale-[1.02] transition-transform">Open Board</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: BOARD VIEW */}
        {activeTab === 'board' && config && (
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
