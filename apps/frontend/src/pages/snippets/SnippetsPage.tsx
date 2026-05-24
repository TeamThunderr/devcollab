import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import api from '../../lib/axios';
import {
  Search, Plus, Code, Copy, CheckCircle2, Folder, Clock, ListFilter, PlayCircle, Eye
} from 'lucide-react';

export default function SnippetsPage(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const location = useLocation();

  // Extract query filters e.g. ?project=projectId
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const projectParam = queryParams.get('project');

  const { projects, fetchProjects } = useProjectStore();

  const [projectSnippets, setProjectSnippets] = useState<Record<string, any[]>>({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  // 1. Hydrate Workspace Projects
  useEffect(() => {
    if (workspaceId) {
      void fetchProjects(workspaceId);
    }
  }, [workspaceId, fetchProjects]);

  // Handle optional query pre-filter parameters from project navigation
  useEffect(() => {
    if (projectParam) {
      setSelectedProjectFilter(projectParam);
    } else {
      setSelectedProjectFilter('all');
    }
  }, [projectParam]);

  // 2. Load Snippets dynamically across projects
  const fetchAllSnippets = async () => {
    if (projects.length === 0) return;
    setGlobalLoading(true);
    const results: Record<string, any[]> = {};
    try {
      await Promise.all(
        projects.map(async (project) => {
          const res = await api.get(`/api/snippets/project/${project.id}`);
          results[project.id] = res.data;
        })
      );
      setProjectSnippets(results);
    } catch (err) {
      console.error('Failed to load workspace snippets:', err);
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    void fetchAllSnippets();
  }, [projects]);

  // 3. Flatten and order all snippets chronologically
  const allSnippets = useMemo(() => {
    const list: any[] = [];
    Object.entries(projectSnippets).forEach(([projId, snips]) => {
      const project = projects.find(p => p.id === projId);
      snips.forEach(s => {
        list.push({
          ...s,
          projectId: projId,
          projectName: project?.name || 'Workspace Project'
        });
      });
    });
    return list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [projectSnippets, projects]);

  // 4. Recently updated list (slice top 5)
  const recentlyUpdated = useMemo(() => {
    return allSnippets.slice(0, 5);
  }, [allSnippets]);

  // 5. Apply filters & search logic
  const filteredSnippets = useMemo(() => {
    return allSnippets.filter(s => {
      const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            s.language.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesProject = selectedProjectFilter === 'all' || s.projectId === selectedProjectFilter;
      return matchesSearch && matchesProject;
    });
  }, [allSnippets, searchQuery, selectedProjectFilter]);

  const handleCopyCode = async (e: React.MouseEvent, snippetId: string, codeText: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(codeText);
      setCopiedSnippetId(snippetId);
      setTimeout(() => setCopiedSnippetId(null), 1500);
    } catch (err) {
      console.error('Failed to copy code snippet:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#121316] text-slate-200 font-sans antialiased px-6 py-8 premium-scrollbar">
      <style>{`
        .glass-panel {
          background: #17191d;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .snippet-card {
          background: #17191d;
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .snippet-card:hover {
          transform: translateY(-2px);
          background: #1e2025;
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 30px -15px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Banner Dashboard Header */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm">
          <div className="space-y-1.5 text-left">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 leading-none">Developer Library</span>
            <h1 className="text-2xl font-semibold text-white">Workspace Snippets</h1>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
               কেন্দ্রীয় repository tracking APIs, utility script modules, and standardized layouts to keep team velocity optimal.
            </p>
          </div>
          
          <Link
            to={`/w/${workspaceId}/snippets/new`}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white px-5 py-2.5 text-xs font-bold transition shadow-sm self-start md:self-center"
          >
            <Plus className="h-4 w-4" /> Create Snippet
          </Link>
        </div>

        {/* Dashboard Filters Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:max-w-md">
            <div className="flex items-center gap-2 bg-[#17191d] border border-white/[0.04] rounded-xl px-4 py-2.5 w-full focus-within:border-indigo-500/30 transition">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search library fragments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs w-full outline-none placeholder-slate-600 text-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ListFilter className="h-4 w-4 text-slate-500" />
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Filter Project:</span>
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="bg-[#17191d] border border-white/[0.04] rounded-xl px-3 py-2 text-xs outline-none text-slate-400 focus:border-indigo-500/50 transition cursor-pointer font-medium"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Workspace Layout Columns */}
        {globalLoading ? (
          <div className="py-24 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 mt-3 font-semibold uppercase tracking-wider">Hydrating repository index...</p>
          </div>
        ) : allSnippets.length === 0 ? (
          <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.04] px-4 py-20 text-center text-xs text-slate-500 bg-white/[0.005] min-h-[350px]">
            <Code className="h-10 w-10 text-slate-700 mb-3" />
            <p className="font-bold text-slate-400 uppercase tracking-wider">Workspace Library Empty</p>
            <p className="text-slate-600 mt-1 max-w-sm leading-relaxed font-medium">No reusable code fragments registered. Click Create Snippet to start saving shared engineering modules.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Left Main Pane: Dynamic Snippet Feed Cards (Span 3 Columns) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  {selectedProjectFilter !== 'all' ? 'Project' : 'Latest'} Snippet Feed ({filteredSnippets.length})
                </h2>
              </div>

              {filteredSnippets.length === 0 ? (
                <div className="glass-panel flex flex-col items-center justify-center rounded-2xl px-4 py-16 text-center text-xs text-slate-400 min-h-[220px]">
                  <p className="font-bold text-slate-500 uppercase tracking-wider">No matching assets</p>
                  <p className="text-slate-600 mt-1">Try adjusting your search criteria or selector filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSnippets.map(snip => (
                    <Link
                      key={snip.id}
                      to={`/w/${workspaceId}/snippets/${snip.id}`}
                      className="snippet-card rounded-2xl p-5 flex flex-col justify-between gap-4 text-left shadow-sm relative overflow-hidden group"
                    >
                      <div className="space-y-3">
                        {/* Title / Project and Language Row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                              {snip.title}
                            </h3>
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-500 uppercase font-mono bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded">
                              <Folder className="h-2.5 w-2.5 text-indigo-400" /> {snip.projectName}
                            </span>
                          </div>
                          
                          <span className="text-[9px] uppercase font-mono tracking-wider px-2 py-0.5 border border-white/[0.04] rounded bg-white/[0.02] text-slate-400 font-extrabold flex-shrink-0">
                            {snip.language}
                          </span>
                        </div>

                        {snip.description && (
                          <p className="text-[11px] text-slate-400 leading-relaxed font-medium line-clamp-2">
                            {snip.description}
                          </p>
                        )}

                        {/* Monaco-style Monospace short Code Preview Box */}
                        <div className="relative group/code mt-2.5">
                          <pre className="bg-slate-950 font-mono text-[10px] text-slate-350 rounded-xl p-3 border border-white/[0.03] overflow-hidden max-h-[110px] select-none pointer-events-none">
                            <code className="line-clamp-5">{snip.code}</code>
                          </pre>

                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            {/* Editor navigation cue */}
                            <div className="p-1.5 rounded-lg border border-white/[0.04] bg-slate-950/80 text-slate-400 hover:text-white transition opacity-0 group-hover:opacity-100 shadow-md">
                              <Eye className="h-3.5 w-3.5" />
                            </div>

                            {/* Copy button widget */}
                            <button
                              type="button"
                              onClick={(e) => handleCopyCode(e, snip.id, snip.code)}
                              className="p-1.5 rounded-lg border border-white/[0.04] bg-slate-950/80 hover:bg-slate-950 text-slate-400 hover:text-white transition opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-md"
                              title="Copy snippet text"
                            >
                              {copiedSnippetId === snip.id ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Footer version logs */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.03] mt-1 text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Updated: {new Date(snip.updatedAt || snip.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        
                        <span className="text-[9px] text-indigo-400 hover:text-indigo-300 font-extrabold flex items-center gap-0.5 transition group-hover:translate-x-0.5">
                          Edit <Plus className="h-3 w-3 rotate-45" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Right Side Pane: Chronological metadata + folders (Span 1 Column) */}
            <div className="space-y-6 text-left">
              {/* Recently updated folder list */}
              <div className="glass-panel p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-white/[0.04] pb-2 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-400" /> Recently Modified
                </h3>
                
                <div className="divide-y divide-white/[0.03] space-y-0.5">
                  {recentlyUpdated.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-2">No snippets loaded.</p>
                  ) : (
                    recentlyUpdated.map(snip => (
                      <Link
                        key={snip.id}
                        to={`/w/${workspaceId}/snippets/${snip.id}`}
                        className="flex justify-between items-center py-2.5 hover:bg-white/[0.01] px-1 rounded-xl transition group font-medium"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors truncate">{snip.title}</p>
                          <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                            {snip.projectName} • <span className="uppercase font-mono">{snip.language}</span>
                          </span>
                        </div>
                        <PlayCircle className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Centralization details banner */}
              <div className="glass-panel p-5 rounded-2xl shadow-sm bg-indigo-500/[0.01] border-indigo-500/10 space-y-2">
                <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                  💡 Engineering Standards
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Centralizing code snippets ensures consistent API usage, keeps database schemas identical, avoids duplicate UI patterns, and helps onboard new developers onto this delivery workspace.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
