/**
 * GlobalSearch — Premium animated command palette (⌘K)
 *
 * Features:
 *  • Framer Motion spring entry/exit
 *  • Context-aware AI suggestions before typing
 *  • Staggered result animations
 *  • AI confidence badges on suggestions
 *  • Keyboard navigation
 *  • Glassmorphism panel
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Kanban, FileText, Code2, Users,
  ChevronRight, SearchX, Sparkles, Sun, BookOpen,
  Zap, ArrowRight, Command,
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import useWikiStore from '../../stores/wikiStore';
import { useSnippetStore } from '../../stores/snippetStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import { cn } from '../../lib/utils';
import AIConfidenceRing from '../ui/AIConfidenceRing';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultType = 'task' | 'wiki' | 'snippet' | 'member';

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle?: string;
  action?: () => void;
}

interface AISuggestion {
  id: string;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  confidence: number;
  shortcut?: string;
  action: () => void;
}

const TYPE_CONFIG: Record<ResultType, {
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bg: string;
}> = {
  task:    { label: 'Tasks',    icon: Kanban,   color: 'text-indigo-400',  bg: 'bg-indigo-500/10'  },
  wiki:    { label: 'Wiki',     icon: FileText,  color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  snippet: { label: 'Snippets', icon: Code2,     color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  member:  { label: 'Members',  icon: Users,     color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps): React.ReactElement | null {
  const navigate = useNavigate();
  const { workspaceId, projectId } = useParams<{ workspaceId?: string; projectId?: string }>();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const tasks    = useTaskStore((s) => s.tasks);
  const pages    = useWikiStore((s) => s.pages);
  const snippets = useSnippetStore((s) => s.snippets);
  const members  = useWorkspaceStore((s) => s.members);

  // AI suggestions (shown when no query)
  const aiSuggestions: AISuggestion[] = useMemo(() => {
    const base: AISuggestion[] = [
      {
        id: 'standup',
        label: 'Generate Standup',
        desc: 'Create daily standup from activity',
        icon: Sun,
        color: 'from-amber-500 to-orange-600',
        confidence: 95,
        shortcut: '⌘1',
        action: () => {
          onClose();
          if (workspaceId && projectId) navigate(`/w/${workspaceId}/p/${projectId}/ai`);
        },
      },
      {
        id: 'review',
        label: 'Code Review',
        desc: 'AI audit your latest changes',
        icon: Code2,
        color: 'from-blue-500 to-indigo-600',
        confidence: 88,
        shortcut: '⌘2',
        action: () => {
          onClose();
          if (workspaceId && projectId) navigate(`/w/${workspaceId}/p/${projectId}/ai`);
        },
      },
      {
        id: 'wiki',
        label: 'Plan Sprint from Wiki',
        desc: 'Turn docs into actionable tasks',
        icon: BookOpen,
        color: 'from-violet-500 to-purple-600',
        confidence: 91,
        shortcut: '⌘3',
        action: () => {
          onClose();
          if (workspaceId && projectId) navigate(`/w/${workspaceId}/p/${projectId}/ai`);
        },
      },
      {
        id: 'breakdown',
        label: 'Engineering Plan',
        desc: 'Feature → tasks + architecture',
        icon: Zap,
        color: 'from-emerald-500 to-teal-600',
        confidence: 84,
        shortcut: '⌘4',
        action: () => {
          onClose();
          if (workspaceId && projectId) navigate(`/w/${workspaceId}/p/${projectId}/ai`);
        },
      },
    ];
    // Only show AI suggestions if we have a project context
    return projectId ? base : [];
  }, [workspaceId, projectId, navigate, onClose]);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Build search results
  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const out: SearchResult[] = [];

    // Tasks
    const projectTasks = projectId ? tasks.filter((t) => t.projectId === projectId) : tasks;
    projectTasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((t) =>
        out.push({
          type: 'task', id: t.id, title: t.title,
          subtitle: t.status.replace(/_/g, ' '),
          action: () => {
            onClose();
            if (workspaceId && projectId) navigate(`/w/${workspaceId}/p/${projectId}/board`);
          },
        }),
      );

    // Wiki
    const projectPages = projectId ? pages.filter((p) => p.projectId === projectId) : pages;
    projectPages
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((p) =>
        out.push({
          type: 'wiki', id: p.id, title: p.title, subtitle: 'Wiki page',
          action: () => {
            onClose();
            if (workspaceId && projectId) navigate(`/w/${workspaceId}/p/${projectId}/wiki`);
          },
        }),
      );

    // Snippets
    const projectSnippets = projectId ? snippets.filter((s) => s.projectId === projectId) : snippets;
    projectSnippets
      .filter((s) => s.title.toLowerCase().includes(q) || s.tags.some((tag) => tag.toLowerCase().includes(q)))
      .slice(0, 3)
      .forEach((s) =>
        out.push({
          type: 'snippet', id: s.id, title: s.title, subtitle: s.language,
          action: () => {
            onClose();
            if (workspaceId && projectId) navigate(`/w/${workspaceId}/p/${projectId}/snippets/${s.id}`);
            else if (workspaceId) navigate(`/w/${workspaceId}/snippets/${s.id}`);
          },
        }),
      );

    // Members
    members
      .filter((m) =>
        (m.user?.name ?? '').toLowerCase().includes(q) || m.user?.email.toLowerCase().includes(q),
      )
      .slice(0, 3)
      .forEach((m) =>
        out.push({
          type: 'member',
          id: m.userId,
          title: m.user?.name ?? m.user?.email ?? 'Unknown',
          subtitle: m.user?.email,
          action: () => {
            onClose();
            if (workspaceId) navigate(`/w/${workspaceId}/members`);
          },
        }),
      );

    return out;
  }, [query, tasks, pages, snippets, members, projectId, workspaceId, navigate, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = query ? results.length : aiSuggestions.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, total - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      if (query && results[activeIndex]) results[activeIndex].action?.();
      else if (!query && aiSuggestions[activeIndex]) aiSuggestions[activeIndex].action();
    }
  };

  useEffect(() => { setActiveIndex(0); }, [results]);

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl
                       bg-[#0B1020]/95 backdrop-blur-2xl
                       border border-[#7C3AED]/20
                       shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(124,58,237,0.15)]"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            {/* Gradient top accent line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#7C3AED]/60 to-transparent" />

            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1F2937]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600
                              flex items-center justify-center flex-shrink-0 shadow-sm">
                <Command className="w-4 h-4 text-white" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search tasks, wiki, snippets… or run an AI action"
                className="flex-1 bg-transparent text-white placeholder-[#4B5563] text-sm outline-none"
                aria-label="Search"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    aria-label="Clear"
                    className="text-[#4B5563] hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md
                                text-[10px] font-mono text-[#4B5563] bg-[#1F2937] border border-[#374151]">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-[420px] overflow-y-auto">

              {/* AI Suggestions (no query) */}
              {!query && aiSuggestions.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span className="text-[10px] font-bold text-[#4B5563] uppercase tracking-wider">
                      AI Actions
                    </span>
                    <span className="ml-auto text-[10px] text-[#374151]">Context-aware</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {aiSuggestions.map((sug, i) => {
                      const Icon = sug.icon;
                      const isActive = i === activeIndex;
                      return (
                        <motion.button
                          key={sug.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={sug.action}
                          onMouseEnter={() => setActiveIndex(i)}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150',
                            'border',
                            isActive
                              ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30'
                              : 'bg-[#111827] border-[#1F2937] hover:border-[#374151]',
                          )}
                        >
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${sug.color}
                                          flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">{sug.label}</p>
                            <p className="text-[10px] text-[#4B5563] truncate">{sug.desc}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <AIConfidenceRing score={sug.confidence} size={28} strokeWidth={2.5} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty no-query state (no project) */}
              {!query && aiSuggestions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Search className="w-8 h-8 text-[#374151] mb-3" />
                  <p className="text-sm text-[#9CA3AF] font-medium">Search anything…</p>
                  <p className="text-xs text-[#4B5563] mt-1">Tasks · Wiki · Snippets · Members</p>
                </div>
              )}

              {/* No results */}
              {query && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <SearchX className="w-8 h-8 text-[#374151] mb-3" />
                  <p className="text-sm text-[#9CA3AF] font-medium">No results for "{query}"</p>
                  <p className="text-xs text-[#4B5563] mt-1">Try different keywords</p>
                </div>
              )}

              {/* Search results grouped */}
              {query && Object.entries(grouped).map(([type, typeResults]) => {
                const config = TYPE_CONFIG[type as ResultType];
                const Icon = config.icon;

                return (
                  <div key={type} className="px-3 py-2">
                    <div className="flex items-center gap-2 px-2 py-1 mb-1">
                      <span className={cn('p-1 rounded-md', config.bg)}>
                        <Icon className={cn('w-3 h-3', config.color)} />
                      </span>
                      <span className="text-[10px] font-bold text-[#4B5563] uppercase tracking-wider">
                        {config.label}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {typeResults.map((result) => {
                        const globalIndex = results.indexOf(result);
                        const isActive = globalIndex === activeIndex;

                        return (
                          <motion.button
                            key={result.id}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: globalIndex * 0.03 }}
                            type="button"
                            onClick={result.action}
                            onMouseEnter={() => setActiveIndex(globalIndex)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100',
                              isActive ? 'bg-[#1F2937]' : 'hover:bg-[#111827]',
                            )}
                          >
                            <Icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{result.title}</p>
                              {result.subtitle && (
                                <p className="text-xs text-[#4B5563] truncate">{result.subtitle}</p>
                              )}
                            </div>
                            {isActive && (
                              <ArrowRight className="w-3.5 h-3.5 text-[#4B5563] flex-shrink-0" />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-[#1F2937] px-5 py-2.5 flex items-center gap-4 text-[10px] text-[#374151]">
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> select</span>
              <span><kbd className="font-mono">ESC</kbd> close</span>
              {projectId && (
                <span className="ml-auto flex items-center gap-1 text-[#4B5563]">
                  <Sparkles className="w-3 h-3 text-[#7C3AED]" />
                  AI-powered
                </span>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
