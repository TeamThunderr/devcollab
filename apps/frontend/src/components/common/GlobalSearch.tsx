/**
 * GlobalSearch — Cmd+K command palette for the active project.
 *
 * Searches tasks, wiki pages, snippets, and members from already-loaded
 * Zustand state (no extra API call needed). Fast, client-side only.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  X,
  Kanban,
  FileText,
  Code2,
  Users,
  ChevronRight,
  SearchX,
  Clock,
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import useWikiStore from '../../stores/wikiStore';
import { useSnippetStore } from '../../stores/snippetStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultType = 'task' | 'wiki' | 'snippet' | 'member';

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  action?: () => void;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ResultType, {
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
}> = {
  task:    { label: 'Tasks',   icon: Kanban,   color: 'text-indigo-400' },
  wiki:    { label: 'Wiki',    icon: FileText,  color: 'text-blue-400'   },
  snippet: { label: 'Snippets',icon: Code2,     color: 'text-emerald-400'},
  member:  { label: 'Members', icon: Users,     color: 'text-amber-400'  },
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

  // Stores
  const tasks    = useTaskStore((s) => s.tasks);
  const pages    = useWikiStore((s) => s.pages);
  const snippets = useSnippetStore((s) => s.snippets);
  const members  = useWorkspaceStore((s) => s.members);

  // Focus input when opened
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

  // Build results from Zustand state (client-side search — zero latency)
  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const out: SearchResult[] = [];

    // Tasks — scoped to active project if available
    const projectTasks = projectId
      ? tasks.filter((t) => t.projectId === projectId)
      : tasks;

    projectTasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((t) =>
        out.push({
          type: 'task',
          id: t.id,
          title: t.title,
          subtitle: t.status.replace('_', ' '),
          action: () => {
            onClose();
            if (workspaceId && projectId) {
              navigate(`/w/${workspaceId}/p/${projectId}/board`);
            }
          },
        }),
      );

    // Wiki pages
    const projectPages = projectId
      ? pages.filter((p) => p.projectId === projectId)
      : pages;

    projectPages
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((p) =>
        out.push({
          type: 'wiki',
          id: p.id,
          title: p.title,
          subtitle: 'Wiki page',
          action: () => {
            onClose();
            if (workspaceId && projectId) {
              navigate(`/w/${workspaceId}/p/${projectId}/wiki`);
            }
          },
        }),
      );

    // Snippets
    const projectSnippets = projectId
      ? snippets.filter((s) => s.projectId === projectId)
      : snippets;

    projectSnippets
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
      .slice(0, 3)
      .forEach((s) =>
        out.push({
          type: 'snippet',
          id: s.id,
          title: s.title,
          subtitle: s.language,
          action: () => {
            onClose();
            if (workspaceId && projectId) {
              navigate(`/w/${workspaceId}/p/${projectId}/snippets/${s.id}`);
            } else if (workspaceId) {
              navigate(`/w/${workspaceId}/snippets/${s.id}`);
            }
          },
        }),
      );

    // Members
    members
      .filter(
        (m) =>
          (m.user?.name ?? '').toLowerCase().includes(q) ||
          m.user?.email.toLowerCase().includes(q),
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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      results[activeIndex].action?.();
    }
  };

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  if (!isOpen) return null;

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh] px-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-xl bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, wiki pages, snippets, members…"
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-500 bg-gray-800 border border-gray-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!query && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-sm text-gray-500">Start typing to search…</p>
              <p className="text-xs text-gray-600 mt-1">Tasks · Wiki · Snippets · Members</p>
            </div>
          )}

          {query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <SearchX className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-sm text-gray-500">No results found</p>
              <p className="text-xs text-gray-600 mt-1">Try different keywords</p>
            </div>
          )}

          {Object.entries(grouped).map(([type, typeResults]) => {
            const config = TYPE_CONFIG[type as ResultType];
            const Icon = config.icon;

            return (
              <div key={type}>
                {/* Section header */}
                <div className="px-4 py-2 flex items-center gap-2">
                  <Icon className={cn('w-3.5 h-3.5', config.color)} />
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    {config.label}
                  </span>
                </div>

                {/* Items */}
                {typeResults.map((result) => {
                  const globalIndex = results.indexOf(result);
                  const isActive = globalIndex === activeIndex;

                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={result.action}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        isActive ? 'bg-gray-800' : 'hover:bg-gray-800/50',
                      )}
                    >
                      <Icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                        )}
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-800 px-4 py-2.5 flex items-center gap-4 text-[10px] text-gray-600">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">ESC</kbd> close</span>
          <span className="ml-auto">Project scope only</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
