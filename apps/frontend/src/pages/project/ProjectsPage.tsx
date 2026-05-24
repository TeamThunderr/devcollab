import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';
import { useBillingStore } from '../../stores/billingStore';
import {
  Search, Plus, Sparkles, Star, Users, Trash2, Crown,
  Zap, Compass, Briefcase, Layers, ChevronRight, X
} from 'lucide-react';

export default function ProjectsPage(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { projects, loading, fetchProjects, createProject, deleteProject } = useProjectStore();
  const { activeWorkspace, fetchWorkspaceDetails } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { subscription, fetchSubscription, upgradeToPro } = useBillingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [starredProjects, setStarredProjects] = useState<string[]>([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Creation Mode: 'quick' or 'advanced'
  const [creationMode, setCreationMode] = useState<'quick' | 'advanced'>('quick');

  // Advanced Wizard Steps (pruned to 3 steps)
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    projectType: 'Internal Product',
    primaryGoal: 'Workflow Organization',
    workspaceStyle: 'Minimal',
    name: '',
    summary: ''
  });

  const [isCompiling, setIsCompiling] = useState(false);
  const [compilingProgress, setCompilingProgress] = useState(0);
  const [compilingStatusText, setCompilingStatusText] = useState('');

  // Fetch initial data
  useEffect(() => {
    if (workspaceId) {
      void fetchProjects(workspaceId);
      void fetchWorkspaceDetails(workspaceId);
      void fetchSubscription(workspaceId);

      const starred = localStorage.getItem(`devcollab_starred_projects_${workspaceId}`);
      if (starred) {
        setStarredProjects(JSON.parse(starred));
      }
    }
  }, [workspaceId, fetchProjects, fetchWorkspaceDetails, fetchSubscription]);

  // Star / Favorite toggle
  const toggleStar = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = starredProjects.includes(projectId)
      ? starredProjects.filter(id => id !== projectId)
      : [...starredProjects, projectId];
    setStarredProjects(next);
    localStorage.setItem(`devcollab_starred_projects_${workspaceId}`, JSON.stringify(next));
  };

  // Filter projects by search
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    return projects.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [projects, searchQuery]);

  // Starred projects list
  const starredList = useMemo(() => {
    return projects.filter(p => starredProjects.includes(p.id));
  }, [projects, starredProjects]);

  // Limit Free plan to 5 projects
  const handleOpenCreateModal = () => {
    const isPro = subscription?.plan === 'PRO';
    if (projects.length >= 5 && !isPro) {
      setShowUpgradeModal(true);
    } else {
      setCreationMode('quick');
      setWizardStep(1);
      setWizardData({
        projectType: 'Internal Product',
        primaryGoal: 'Workflow Organization',
        workspaceStyle: 'Minimal',
        name: '',
        summary: ''
      });
      setShowCreateModal(true);
    }
  };

  const handleProUpgrade = async () => {
    if (user && workspaceId) {
      await upgradeToPro(workspaceId, user.email, user.name ?? undefined);
      setShowUpgradeModal(false);
    }
  };

  // Launch project creation with clean optimistic compiling screen
  const handleLaunchProject = async () => {
    const projectName = creationMode === 'quick' ? wizardData.name.trim() : wizardData.name.trim();
    if (!projectName || !workspaceId) return;

    setIsCompiling(true);
    setCompilingProgress(15);
    setCompilingStatusText('Initializing workspace directory...');

    const statuses = [
      { p: 45, t: 'Building Kanban pipeline schema...' },
      { p: 75, t: 'Applying visual design configurations...' },
      { p: 100, t: 'Spawning collaboration sockets. Launching...' }
    ];

    let currentIdx = 0;
    const interval = setInterval(async () => {
      if (currentIdx < statuses.length) {
        setCompilingProgress(statuses[currentIdx].p);
        setCompilingStatusText(statuses[currentIdx].t);
        currentIdx++;
      } else {
        clearInterval(interval);
        try {
          const created = await createProject({
            name: projectName,
            description: wizardData.summary.trim() || undefined,
            workspaceId
          });

          // Build custom modern project workspace configs
          const newConfig = {
            name: projectName,
            description: wizardData.summary.trim() || undefined,
            projectType: wizardData.projectType,
            primaryGoal: wizardData.primaryGoal,
            workspaceStyle: wizardData.workspaceStyle,
            columns: [
              { id: 'TODO', title: 'To Do' },
              { id: 'IN_PROGRESS', title: 'In Progress' },
              { id: 'IN_REVIEW', title: 'In Review' },
              { id: 'DONE', title: 'Completed' }
            ],
            sprints: [],
            activities: [
              {
                id: `act-${Date.now()}`,
                userName: user?.name || 'Owner',
                details: `created project "${projectName}"`,
                timestamp: new Date().toISOString()
              }
            ],
            notifications: [
              {
                id: `notif-${Date.now()}`,
                message: `🚀 Welcome to the new project workspace "${projectName}"!`,
                read: false,
                timestamp: new Date().toISOString()
              }
            ]
          };

          localStorage.setItem(`devcollab_project_workspace_${created.id}`, JSON.stringify(newConfig));

          setIsCompiling(false);
          setShowCreateModal(false);
          navigate(`/${workspaceId}/projects/${created.id}`);
        } catch (err: any) {
          setIsCompiling(false);
          alert(`Failed to create project: ${err.message}`);
        }
      }
    }, 300);
  };

  const handleDeleteProject = async (projectId: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete "${name}"? This will permanently wipe all tasks, comments, and project data.`)) {
      return;
    }
    try {
      await deleteProject(projectId);
      localStorage.removeItem(`devcollab_project_workspace_${projectId}`);
    } catch (err: any) {
      alert(`Error deleting project: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090a] text-slate-200 font-sans antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* Visual Depth Injectors */}
      <style>{`
        .glass-card {
          background: rgba(18, 19, 24, 0.45);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .smooth-lift {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .smooth-lift:hover {
          transform: translateY(-2px);
          border-color: rgba(99, 102, 241, 0.2);
          box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.5), 0 0 20px -2px rgba(99, 102, 241, 0.05);
        }
        .text-gradient {
          background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-6 py-12 space-y-12">
        {/* Hub Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-white/[0.04]">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md">
                Projects Hub
              </span>
              {subscription?.plan === 'PRO' ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md">
                  <Crown className="h-3 w-3" /> Pro Workspace
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-slate-900 border border-slate-800 text-slate-400 rounded-md">
                  Free Account
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans sm:text-4xl">
              <span className="text-gradient">{activeWorkspace?.name || 'Workspace'} Projects</span>
            </h1>
            <p className="text-xs text-slate-450 max-w-xl font-medium leading-relaxed">
              Track project milestones, tasks status, and stream alignments inside a unified workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-550 active:scale-[0.98] text-white px-4.5 py-2.5 text-xs font-bold transition-all shadow-md shadow-indigo-650/10 self-start md:self-center font-sans tracking-wide"
          >
            <Plus className="h-4 w-4" /> Create Project
          </button>
        </div>

        {/* STARRED PROJECTS (Elevated Top Section) */}
        {starredList.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-[10px] uppercase tracking-widest font-extrabold text-indigo-400 flex items-center gap-1.5 leading-none">
              <Star className="h-3.5 w-3.5 fill-current text-amber-400" /> Starred Workspaces
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {starredList.map(project => (
                <Link
                  to={`/${workspaceId}/projects/${project.id}`}
                  key={`starred-${project.id}`}
                  className="glass-card smooth-lift rounded-2xl p-5 flex items-center justify-between transition-all"
                >
                  <div className="space-y-1.5 min-w-0 pr-4">
                    <h3 className="text-sm font-bold text-white leading-tight truncate">{project.name}</h3>
                    <p className="text-[11px] text-slate-400 leading-normal truncate">{project.description || 'No description provided.'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => toggleStar(project.id, e)}
                    className="p-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] text-amber-400 transition flex-shrink-0"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* SEARCH AND FILTERS */}
        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-2.5 max-w-sm focus-within:border-indigo-500/30 transition duration-150">
          <Search className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs w-full outline-none placeholder-slate-500 text-slate-200"
          />
        </div>

        {/* PROJECTS GRID */}
        {loading ? (
          <div className="py-32 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold font-mono">Syncing workspaces...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="border border-dashed border-white/[0.04] bg-white/[0.01] rounded-2xl p-16 text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/[0.04] flex items-center justify-center mx-auto text-slate-450">
              <Compass className="h-5 w-5" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="text-xs font-bold text-white">No projects found</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {searchQuery ? "No matches fit your search criteria." : "Start by creating your first workspace stream to organize milestones."}
              </p>
            </div>
            {!searchQuery && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Start Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const starred = starredProjects.includes(project.id);
              return (
                <Link
                  to={`/${workspaceId}/projects/${project.id}`}
                  key={project.id}
                  className="glass-card smooth-lift rounded-2xl p-6 flex flex-col justify-between min-h-[190px] group transition-all duration-200"
                >
                  <div className="space-y-2 text-left">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors leading-snug truncate max-w-[80%]">
                        {project.name}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => toggleStar(project.id, e)}
                        className={`p-1.5 rounded-lg border transition-all ${starred
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : 'border-white/[0.04] hover:border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${starred ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-450 leading-relaxed line-clamp-2 min-h-[2.2rem]">
                      {project.description || 'No description provided for this project.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/[0.04] mt-4">
                    {/* Subtle Progress Bar */}
                    <div className="space-y-1 text-left">
                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-extrabold font-mono leading-none">
                        <span className="uppercase tracking-wider">Progress</span>
                        <span>{project._count?.tasks ?? 0} Tasks</span>
                      </div>
                      <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-white/[0.02]">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: project._count?.tasks ? '65%' : '0%' }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="font-semibold text-slate-450">Active Stream</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleDeleteProject(project.id, project.name);
                          }}
                          className="p-1 text-slate-600 hover:text-rose-400 transition duration-150 opacity-0 group-hover:opacity-100"
                          title="Delete Project Workspace"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
                          {project._count?.tasks ? 'Milestones' : 'Empty'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── UPGRADE TO PRO MODAL ────────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050607]/80 px-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[#0e0f12] border border-white/[0.04] shadow-2xl p-6 text-white text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex justify-center">
              <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-650 flex items-center justify-center text-xl shadow-lg shadow-indigo-650/10">
                <Crown className="h-5 w-5 text-amber-300 animate-pulse" />
              </span>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight">Upgrade to Pro</h2>
              <p className="text-xs text-slate-400 leading-relaxed">Unlock unlimited projects, AI Copilot expansion, and custom workspace flows.</p>
            </div>
            <div className="border border-white/[0.04] rounded-xl p-3.5 bg-white/[0.01] text-left text-xs space-y-1.5 text-slate-400">
              <p className="flex items-center gap-2">✓ <span className="font-semibold text-white">Unlimited active projects</span></p>
              <p className="flex items-center gap-2">✓ <span className="font-semibold text-white">Clean Kanban Board custom columns</span></p>
              <p className="flex items-center gap-2">✓ <span className="font-semibold text-white">Full Timeline audit feeds</span></p>
              <p className="flex items-center gap-2">✓ <span className="font-semibold text-white">AI Copilot subtask adapters</span></p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 rounded-xl border border-slate-800 py-2 text-xs font-bold hover:bg-slate-900 transition text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProUpgrade}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 py-2 text-xs font-bold shadow-lg shadow-indigo-600/10 hover:opacity-95 transition text-slate-950 font-extrabold"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE PROJECT DUAL-MODE MODAL ────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050607]/80 px-4 backdrop-blur-md animate-in fade-in duration-200">
          {isCompiling ? (
            /* PROGRESS LOADING SCREEN */
            <div className="w-full max-w-sm bg-[#0e0f12] border border-white/[0.04] p-6 rounded-2xl shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-150">
              <div className="flex justify-center animate-pulse">
                <div className="w-10 h-10 bg-indigo-600/10 rounded-full border border-indigo-500/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-indigo-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">Compiling Workspace</h2>
                <p className="text-xs text-slate-500 h-4 truncate">{compilingStatusText}</p>
              </div>
              <div className="space-y-1.5">
                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-white/[0.02]">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${compilingProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] font-extrabold text-slate-500 font-mono">
                  <span>Assembling lanes</span>
                  <span>{compilingProgress}%</span>
                </div>
              </div>
            </div>
          ) : (
            /* NORMAL FORM WIZARD */
            <div className="w-full max-w-xl bg-[#0e0f12] border border-white/[0.04] rounded-2xl p-6 text-white shadow-2xl relative animate-in zoom-in-95 duration-150 flex flex-col justify-between min-h-[380px]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="space-y-4">
                {/* Stepper Header / Tabs */}
                <div className="text-left border-b border-white/[0.04] pb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCreationMode('quick')}
                      className={`text-xs font-bold px-3 py-1 rounded-md transition ${creationMode === 'quick' ? 'bg-white/5 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Quick Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreationMode('advanced')}
                      className={`text-xs font-bold px-3 py-1 rounded-md transition ${creationMode === 'advanced' ? 'bg-white/5 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Advanced Setup
                    </button>
                  </div>
                  {creationMode === 'advanced' && (
                    <span className="text-[9px] font-extrabold uppercase font-mono tracking-widest text-indigo-400">Step {wizardStep} of 3</span>
                  )}
                </div>

                {/* MODES: QUICK OR ADVANCED */}
                <div className="py-2 text-left">
                  {creationMode === 'quick' ? (
                    <div className="space-y-4 animate-in fade-in duration-100">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-bold text-white">Create a new project workspace</h3>
                        <p className="text-xs text-slate-500">Fast, streamlined setup. You will be able to edit pipeline styles inside the workspace dashboard.</p>
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Project Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Apollo Dashboard"
                            value={wizardData.name}
                            onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                            className="w-full bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500/50 text-white placeholder-slate-650 transition"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Short Summary</label>
                          <textarea
                            placeholder="Briefly describe the objective of this workspace..."
                            value={wizardData.summary}
                            onChange={(e) => setWizardData({ ...wizardData, summary: e.target.value })}
                            rows={3}
                            className="w-full bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500/50 text-white placeholder-slate-650 transition resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-100">
                      {wizardStep === 1 && (
                        <div className="space-y-3 text-left">
                          <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-white">What type of project are you managing?</h3>
                            <p className="text-xs text-slate-500">Pick a baseline stream target to configure workspace templates.</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            {[
                              { key: 'Client Project', icon: <Briefcase className="h-4 w-4" />, desc: 'Deliverables for clients' },
                              { key: 'Internal Product', icon: <Layers className="h-4 w-4" />, desc: 'Core product features' },
                              { key: 'Startup MVP', icon: <Sparkles className="h-4 w-4" />, desc: 'Rapid velocity setup' },
                              { key: 'Other', icon: <Compass className="h-4 w-4" />, desc: 'Custom workspace deck' }
                            ].map(opt => {
                              const selected = wizardData.projectType === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => setWizardData({ ...wizardData, projectType: opt.key })}
                                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 hover:-translate-y-0.5 transition-all duration-155 relative overflow-hidden ${selected
                                      ? 'bg-indigo-650/10 border-indigo-500'
                                      : 'bg-slate-950/40 border-white/[0.04] hover:border-slate-800'
                                    }`}
                                >
                                  <span className={`${selected ? 'text-indigo-400' : 'text-slate-500'}`}>{opt.icon}</span>
                                  <div>
                                    <p className="text-xs font-bold text-white leading-tight">{opt.key}</p>
                                    <p className="text-[9px] text-slate-500 leading-none mt-0.5">{opt.desc}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {wizardStep === 2 && (
                        <div className="space-y-3 text-left">
                          <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-white">Choose your workspace style</h3>
                            <p className="text-xs text-slate-500">Pick a visual styling template to theme the internal board deck.</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            {[
                              { key: 'Minimal', desc: 'Clean slate theme, strict borders, high breathing room.' },
                              { key: 'Professional', desc: 'Deep corporate slate, optimized high contrast layout.' },
                              { key: 'Creative', desc: 'Subtle gradients, glowing borders, active hovers.' },
                              { key: 'Enterprise', desc: 'Dense grids, dense columns, comprehensive widgets.' }
                            ].map(opt => {
                              const selected = wizardData.workspaceStyle === opt.key;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => setWizardData({ ...wizardData, workspaceStyle: opt.key })}
                                  className={`p-3 rounded-xl border text-left space-y-1 hover:-translate-y-0.5 transition-all duration-155 relative ${selected
                                      ? 'bg-indigo-650/10 border-indigo-500'
                                      : 'bg-slate-950/40 border-white/[0.04] hover:border-slate-800'
                                    }`}
                                >
                                  <p className="text-xs font-bold text-white leading-tight">{opt.key}</p>
                                  <p className="text-[9px] text-slate-500 leading-normal">{opt.desc}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {wizardStep === 3 && (
                        <div className="space-y-4 text-left">
                          <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-white">Give your project a name</h3>
                            <p className="text-xs text-slate-500">Simple, memorable names align team milestones best.</p>
                          </div>
                          <div className="space-y-3 pt-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Project Name</label>
                              <input
                                type="text"
                                placeholder="e.g. Apollo Dashboard"
                                value={wizardData.name}
                                onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                                className="w-full bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500/50 text-white placeholder-slate-650 transition"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Short Summary</label>
                              <textarea
                                placeholder="Briefly describe the objective of this workspace..."
                                value={wizardData.summary}
                                onChange={(e) => setWizardData({ ...wizardData, summary: e.target.value })}
                                rows={3}
                                className="w-full bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500/50 text-white placeholder-slate-650 transition resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Wizard Navigation / Form Submission */}
              <div className="flex justify-between items-center mt-6 border-t border-white/[0.04] pt-4">
                {creationMode === 'quick' ? (
                  <>
                    <span className="text-[10px] text-indigo-400 font-semibold cursor-pointer hover:underline" onClick={() => setCreationMode('advanced')}>
                      Use Advanced Setup →
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleLaunchProject()}
                      disabled={!wizardData.name.trim()}
                      className="rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 disabled:pointer-events-none transition px-5 py-2 text-xs font-bold text-white flex items-center shadow-md shadow-indigo-650/5"
                    >
                      🚀 Create Project
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setWizardStep(prev => prev - 1)}
                      disabled={wizardStep === 1}
                      className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold hover:bg-slate-900 disabled:opacity-40 disabled:pointer-events-none transition text-slate-400"
                    >
                      Back
                    </button>
                    {wizardStep < 3 ? (
                      <button
                        type="button"
                        onClick={() => setWizardStep(prev => prev + 1)}
                        className="rounded-xl bg-indigo-650 hover:bg-indigo-600 transition px-4 py-2 text-xs font-bold text-white flex items-center gap-1"
                      >
                        Continue <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleLaunchProject()}
                        disabled={!wizardData.name.trim()}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-550 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none transition px-5 py-2 text-xs font-extrabold shadow-lg shadow-indigo-600/10 text-white flex items-center gap-1.5"
                      >
                        🚀 Compile Workspace
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
