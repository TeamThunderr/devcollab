import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';
import { useBillingStore } from '../../stores/billingStore';
import {
  Search, Plus, Star, Users, Trash2, Crown,
  Zap, Compass, X
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

  // Unified Creation State
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
    const projectName = wizardData.name.trim();
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
          navigate(`/w/${workspaceId}/p/${created.id}`);
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
  };  return (
    <div className="min-h-screen bg-[#121316] text-slate-200 font-sans antialiased premium-scrollbar selection:bg-indigo-500/30 selection:text-white">
      {/* Visual Depth Injectors */}
      <style>{`
        .glass-card {
          background: #17191d;
          border: 1px solid rgba(255, 255, 255, 0.04);
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.3);
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
            <h1 className="text-2xl font-semibold tracking-tight text-white font-sans sm:text-3xl">
              <span className="text-gradient">{activeWorkspace?.name || 'Workspace'} Projects</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-xl font-medium leading-relaxed">
              Track project milestones, tasks status, and stream alignments inside a unified workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 active:scale-[0.98] text-white px-4.5 py-2.5 text-xs font-bold transition-all shadow-md shadow-indigo-650/10 self-start md:self-center font-sans tracking-wide"
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
                  to={`/w/${workspaceId}/p/${project.id}`}
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
            placeholder="Search projects"
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white px-4 py-2 text-xs font-bold transition shadow-sm"
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
                  to={`/w/${workspaceId}/p/${project.id}`}
                  key={project.id}
                  className="glass-card smooth-lift rounded-2xl p-6 flex flex-col justify-between min-h-[190px] group transition-all duration-200"
                >
                  <div className="space-y-2 text-left">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors leading-snug truncate max-w-[80%]">
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

                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 min-h-[2.2rem]">
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
                        <span className="font-semibold text-slate-400">Active Stream</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleDeleteProject(project.id, project.name);
                          }}
                          className="p-1 text-slate-600 hover:text-rose-450 transition duration-150 opacity-0 group-hover:opacity-100"
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
          <div className="w-full max-w-sm rounded-2xl bg-[#17191d] border border-white/[0.04] shadow-2xl p-6 text-white text-center space-y-5 animate-in zoom-in-95 duration-150">
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
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-650 py-2 text-xs font-bold shadow-lg shadow-indigo-650/10 hover:opacity-95 transition text-slate-950 font-extrabold"
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
            <div className="w-full max-w-sm bg-[#17191d] border border-white/[0.04] p-6 rounded-2xl shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-150">
              <div className="flex justify-center animate-pulse">
                <div className="w-10 h-10 bg-indigo-600/10 rounded-full border border-indigo-500/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-indigo-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">Compiling Workspace</h2>
                <p className="text-xs text-slate-400 h-4 truncate">{compilingStatusText}</p>
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
            /* NORMAL FORM WIZARD (Pruned to compact minimal style) */
            <div className="w-full max-w-md bg-[#17191d] border border-white/[0.04] rounded-2xl p-6 text-white shadow-2xl relative animate-in zoom-in-95 duration-150 flex flex-col justify-between">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="space-y-4">
                <div className="text-left pb-1 border-b border-white/[0.04]">
                  <h2 className="text-base font-semibold text-white">Create Project</h2>
                  <p className="text-xs text-slate-400 mt-1">Start a clean delivery stream to manage milestones.</p>
                </div>

                <div className="space-y-3.5 text-left">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Project Name</label>
                    <input
                      type="text"
                      placeholder="Your project name"
                      value={wizardData.name}
                      onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                      className="w-full bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500/50 text-white placeholder-slate-650 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Short Summary</label>
                    <textarea
                      placeholder="Short project summary"
                      value={wizardData.summary}
                      onChange={(e) => setWizardData({ ...wizardData, summary: e.target.value })}
                      rows={3}
                      className="w-full bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500/50 text-white placeholder-slate-650 transition resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Workspace Style</label>
                    <select
                      value={wizardData.workspaceStyle}
                      onChange={(e) => setWizardData({ ...wizardData, workspaceStyle: e.target.value })}
                      className="w-full bg-slate-950 border border-white/[0.04] rounded-xl px-3 py-2.5 text-xs outline-none focus:border-indigo-500/50 text-slate-400 transition"
                    >
                      <option value="Minimal">Minimal</option>
                      <option value="Professional">Professional</option>
                      <option value="Creative">Creative</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 border-t border-white/[0.04] pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs font-bold hover:bg-slate-900 transition text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleLaunchProject()}
                  disabled={!wizardData.name.trim()}
                  className="rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 disabled:pointer-events-none transition px-5 py-2.5 text-xs font-bold text-white flex items-center shadow-md shadow-indigo-650/5"
                >
                  Create Project
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
