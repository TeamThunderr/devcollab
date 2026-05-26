import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useSnippetStore } from '../../stores/snippetStore';
import { useProjectStore } from '../../stores/projectStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';
import { useSnippetSync } from '../../hooks/useSnippetSync';
import api from '../../lib/axios';
import {
  ArrowLeft, Copy, CheckCircle2, Trash2, Save, FileCode2, Clock, Info
} from 'lucide-react';

export default function SnippetEditorPage(): React.ReactElement {
  const { workspaceId, projectId, snippetId } = useParams<{ workspaceId: string; projectId?: string; snippetId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const projectParam = queryParams.get('project');
  const effectiveProjectId = projectId || projectParam;

  const { projects } = useProjectStore();
  const { createSnippet, updateSnippet, deleteSnippet } = useSnippetStore();
  const { user: currentUser } = useAuthStore();
  const { members } = useWorkspaceStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Snippet values
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('// Paste or write your code fragment here\n');
  const [targetProjectId, setTargetProjectId] = useState('');

  // Synchronize snippet changes reactively
  useSnippetSync(targetProjectId || effectiveProjectId || undefined);

  const isViewer = useMemo(() => {
    if (!currentUser) return true;
    const wsMember = members.find(m => m.userId === currentUser.id);
    if (wsMember) {
      if (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN') return false;
      if (wsMember.role === 'VIEWER') return true;
    }

    const project = projects.find(p => p.id === targetProjectId);
    if (project?.createdBy?.id === currentUser.id) return false;
    return wsMember?.role === 'VIEWER' || !wsMember;
  }, [currentUser, members, projects, targetProjectId]);
  
  // Timestamps (Read-only)
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const isNew = snippetId === 'new';

  // Prevent VIEWERS from accessing composition workflow
  if (isNew && isViewer) {
    return (
      <div className="min-h-screen bg-[#121316] text-slate-200 font-sans antialiased flex items-center justify-center p-6">
        <div className="glass-panel max-w-md w-full rounded-2xl p-8 text-center space-y-4 shadow-2xl border border-white/[0.04]">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">Access Denied</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Workspace Viewers have strictly read-only access and are not authorized to compose or create new code snippets.
          </p>
          <div className="pt-2">
            <Link
              to={projectId ? `/w/${workspaceId}/p/${projectId}/board?tab=snippets` : `/w/${workspaceId}/snippets`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white px-5 py-2.5 text-xs font-bold transition shadow-sm"
            >
              Go Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 1. Removed redundant fetchProjects since WorkspaceLayout handles it.
  useEffect(() => {
    // keeping empty for any future workspace-level init
  }, [workspaceId]);

  // Set default project in selector when projects list is populated
  useEffect(() => {
    if (projects.length > 0 && !targetProjectId) {
      if (isNew && effectiveProjectId) {
        setTargetProjectId(effectiveProjectId);
      } else {
        setTargetProjectId(projects[0].id);
      }
    }
  }, [projects, targetProjectId, isNew, effectiveProjectId]);

  // 2. Fetch existing snippet details if not 'new'
  useEffect(() => {
    if (isNew) {
      setTitle('');
      setDescription('');
      setLanguage('javascript');
      setCode('// Paste or write your code fragment here\n');
      setCreatedAt(null);
      setUpdatedAt(null);
      setCreatorName(null);
      return;
    }

    const fetchSnippetDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/snippets/${snippetId}`);
        const snip = response.data;
        setTitle(snip.title);
        setDescription(snip.description || '');
        setLanguage(snip.language);
        setCode(snip.code);
        setTargetProjectId(snip.projectId);
        setCreatedAt(snip.createdAt);
        setUpdatedAt(snip.updatedAt);
        if (snip.createdBy) {
          setCreatorName(snip.createdBy.name || snip.createdBy.email);
        }
      } catch (err: any) {
        console.error('Failed to load snippet:', err);
        setError(err.message || 'Failed to fetch snippet details.');
      } finally {
        setLoading(false);
      }
    };

    if (snippetId) {
      void fetchSnippetDetails();
    }
  }, [snippetId, isNew]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Snippet title is required.');
      return;
    }
    if (!code.trim()) {
      setError('Snippet code block is required.');
      return;
    }
    if (!targetProjectId) {
      setError('Please select a project to associate this snippet.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isNew) {
        await createSnippet(
          title.trim(),
          language,
          code.trim(),
          description.trim() || undefined,
          [], // tags
          targetProjectId
        );
      } else if (snippetId) {
        await updateSnippet(snippetId, {
          title: title.trim(),
          language,
          code: code.trim(),
          description: description.trim() || undefined,
          projectId: targetProjectId
        });
      }

      // Route back to specific project or workspace dashboard
      if (projectId) {
        navigate(`/w/${workspaceId}/p/${projectId}/board?tab=snippets`);
      } else if (projectParam) {
        navigate(`/w/${workspaceId}/p/${projectParam}/board?tab=snippets`);
      } else {
        navigate(`/w/${workspaceId}/snippets`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save snippet details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!snippetId || isNew) return;
    if (window.confirm('Are you sure you want to delete this snippet? This action is irreversible.')) {
      setLoading(true);
      try {
        await deleteSnippet(snippetId);
        if (projectId) {
          navigate(`/w/${workspaceId}/p/${projectId}/board?tab=snippets`);
        } else if (projectParam) {
          navigate(`/w/${workspaceId}/p/${projectParam}/board?tab=snippets`);
        } else {
          navigate(`/w/${workspaceId}/snippets`);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to delete snippet.');
        setLoading(false);
      }
    }
  };

  const editorOptions = {
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    minimap: { enabled: false },
    wordWrap: 'on' as const,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 16, bottom: 16 },
    tabSize: 2,
    renderLineHighlight: 'all' as const,
    smoothScrolling: true,
    readOnly: isViewer,
    scrollbar: {
      vertical: 'visible' as const,
      horizontal: 'visible' as const,
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false,
      verticalScrollbarSize: 6,
      horizontalScrollbarSize: 6
    }
  };

  return (
    <div className="min-h-screen bg-[#121316] text-slate-200 font-sans antialiased px-6 py-6 premium-scrollbar">
      {/* visual depth styles */}
      <style>{`
        .glass-panel {
          background: #17191d;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .editor-container {
          background: #1e2025;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
      `}</style>

      <div className="mx-auto max-w-7xl h-[calc(100vh-3rem)] flex flex-col gap-5">
        {/* Navigation bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={
                projectId
                  ? `/w/${workspaceId}/p/${projectId}/board?tab=snippets`
                  : projectParam
                    ? `/w/${workspaceId}/p/${projectParam}/board?tab=snippets`
                    : `/w/${workspaceId}/snippets`
              }
              className="p-2 border border-white/[0.04] bg-[#17191d] hover:bg-[#1e2025] hover:text-white text-slate-400 rounded-xl transition shadow-sm"
              title={projectId || projectParam ? "Back to project board" : "Back to dashboard"}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="text-left">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 leading-none">
                {isNew ? 'Workspace Snippet Composer' : 'Snippet Editor'}
              </span>
              <h1 className="text-xl font-semibold text-white leading-tight">
                {isNew ? 'Create Reusable Snippet' : title || 'Edit Code Fragment'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isNew && !isViewer && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || saving}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/10 hover:border-rose-500/20 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 px-4 py-2.5 text-xs font-bold transition shadow-sm"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}

            {isViewer ? (
              <span className="bg-white/[0.04] border border-white/[0.08] text-slate-400 rounded-xl px-4 py-2.5 text-xs font-bold font-mono">
                👁️ Viewer Mode (Read-only)
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || saving || !title.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 disabled:pointer-events-none text-white px-5 py-2.5 text-xs font-bold transition shadow-sm"
              >
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Snippet'}
              </button>
            )}
          </div>
        </div>

        {/* Error Indicator */}
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-400 flex items-center gap-2.5 text-left">
            <Info className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Main Work Area */}
        {loading ? (
          <div className="glass-panel flex-1 flex flex-col items-center justify-center rounded-2xl">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 mt-3 font-semibold uppercase tracking-wider">Loading snippet settings...</p>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
            {/* Editor Console */}
            <div className="lg:col-span-2 flex flex-col min-h-0 min-w-0">
              <div className="editor-container rounded-2xl overflow-hidden flex flex-col flex-1 shadow-2xl relative min-h-[350px]">
                {/* Monaco Header info */}
                <div className="bg-[#17191d] px-4 py-3 border-b border-white/[0.04] flex items-center justify-between select-none">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-mono font-bold text-white">
                      {title.trim() ? title.trim().toLowerCase().replace(/\s+/g, '_') + '.' + (
                        language === 'typescript' ? 'ts' :
                        language === 'javascript' ? 'js' :
                        language === 'python' ? 'py' :
                        language === 'json' ? 'json' :
                        language === 'html' ? 'html' :
                        language === 'css' ? 'css' :
                        language === 'markdown' ? 'md' :
                        language === 'rust' ? 'rs' :
                        language === 'go' ? 'go' : 'txt'
                      ) : 'untitled_fragment'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1.5 border border-white/[0.04] bg-slate-950/80 hover:bg-slate-950 rounded-lg hover:text-white text-slate-400 transition shadow-sm flex items-center gap-1.5 text-[10px] font-bold"
                    title="Copy code"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Editor Surface */}
                <div className="flex-1 min-h-0 min-w-0 relative">
                  <Editor
                    height="100%"
                    language={language}
                    value={code}
                    theme="vs-dark"
                    onChange={(val) => setCode(val ?? '')}
                    options={editorOptions}
                    loading={
                      <div className="absolute inset-0 flex items-center justify-center bg-[#1e2025]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">Initializing Editor IDE...</span>
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>

            {/* Sidebar properties card */}
            <div className="space-y-6 overflow-y-auto pr-1 premium-scrollbar">
              <div className="glass-panel p-5 rounded-2xl shadow-sm text-left space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-white/[0.04] pb-2">Properties</h3>

                <div className="space-y-4">
                  {/* Title block */}
                  <div className="grid gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Snippet Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Fetch adapter utility"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isViewer}
                      className="bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2.5 text-xs outline-none text-slate-200 placeholder-slate-650 focus:border-indigo-500/50 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Description block */}
                  <div className="grid gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Description</label>
                    <input
                      type="text"
                      placeholder="Explain what this snippet accomplishes..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isViewer}
                      className="bg-slate-950 border border-white/[0.04] rounded-xl px-4 py-2.5 text-xs outline-none text-slate-200 placeholder-slate-650 focus:border-indigo-500/50 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Language Selector */}
                  <div className="grid gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Language Type</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      disabled={isViewer}
                      className="bg-slate-950 border border-white/[0.04] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500/50 text-slate-400 transition cursor-pointer font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                      <option value="json">JSON</option>
                      <option value="markdown">Markdown</option>
                      <option value="go">Go</option>
                      <option value="rust">Rust</option>
                      <option value="bash">Bash</option>
                    </select>
                  </div>

                  {/* Project association selector */}
                  <div className="grid gap-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Associated Project</label>
                    <select
                      value={targetProjectId}
                      onChange={(e) => setTargetProjectId(e.target.value)}
                      disabled={!!projectId || isViewer}
                      className="bg-slate-950 border border-white/[0.04] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500/50 text-slate-400 transition cursor-pointer font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Snippet stats metadata */}
              {!isNew && createdAt && (
                <div className="glass-panel p-5 rounded-2xl shadow-sm text-left space-y-3.5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-white/[0.04] pb-2 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-400" /> Version History
                  </h3>
                  
                  <div className="space-y-2.5 text-[11px] text-slate-400 font-medium">
                    <div className="flex justify-between border-b border-white/[0.02] pb-1.5">
                      <span className="text-slate-500">Author:</span>
                      <span className="text-slate-300 font-bold">{creatorName || 'Member'}</span>
                    </div>

                    <div className="flex justify-between border-b border-white/[0.02] pb-1.5">
                      <span className="text-slate-500">Created:</span>
                      <span className="text-slate-300">
                        {new Date(createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Modified:</span>
                      <span className="text-slate-300">
                        {new Date(updatedAt || createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
