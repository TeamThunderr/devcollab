/**
 * src/components/topbar/Topbar.tsx
 *
 * Premium glassmorphism topbar with:
 * - Animated breadcrumb / page title (Framer Motion layout)
 * - ⌘K search trigger pill
 * - AI status badge
 * - Collaborative presence avatars
 * - Notification bell
 * - User avatar with profile link
 */

import React from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, Command } from 'lucide-react';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';
import { usePresence } from '../../hooks/usePresence';
import NotificationBell from '../notifications/NotificationBell';
import CollaborativePresence from '../ui/CollaborativePresence';
import AIStatusBadge from '../ui/AIStatusBadge';

// ─── Page title map ────────────────────────────────────────────────────────────

function usePageTitle(): { title: string; section?: string } {
  const { pathname } = useLocation();
  if (pathname.includes('/editor'))   return { title: 'Code Editor',    section: 'Project' };
  if (pathname.includes('/wiki'))     return { title: 'Wiki',           section: 'Project' };
  if (pathname.includes('/board'))    return { title: 'Board',          section: 'Project' };
  if (pathname.includes('/snippets')) return { title: 'Snippets',       section: 'Project' };
  if (pathname.includes('/ai'))       return { title: 'AI Assistant',   section: 'Project' };
  if (pathname.includes('/activity')) return { title: 'Activity Feed',  section: 'Workspace' };
  if (pathname.includes('/members'))  return { title: 'Members',        section: 'Workspace' };
  if (pathname.includes('/billing'))  return { title: 'Billing',        section: 'Settings' };
  if (pathname.includes('/settings')) return { title: 'Settings',       section: 'Workspace' };
  if (pathname.includes('/projects')) return { title: 'Projects',       section: 'Workspace' };
  if (pathname === '/workspaces')     return { title: 'Workspaces',     section: undefined };
  return                                     { title: 'Overview',       section: 'Workspace' };
}

// ─── Search pill ───────────────────────────────────────────────────────────────

function SearchPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      id="topbar-search-pill"
      aria-label="Open command palette (⌘K)"
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg
                 bg-[#0F1629] border border-[#1F2937] hover:border-[#374151]
                 text-[#4B5563] hover:text-[#9CA3AF]
                 transition-all duration-200 hover:bg-[#111827] group"
    >
      <Search className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-xs font-medium w-28 text-left">Search…</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md
                      text-[10px] font-mono text-[#4B5563] group-hover:text-[#6B7280]
                      bg-[#1F2937] border border-[#374151]">
        <Command className="w-2.5 h-2.5" />K
      </kbd>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TopbarProps {
  onSearchOpen?: () => void;
}

export default function Topbar({ onSearchOpen }: TopbarProps): React.ReactElement {
  const { workspaceId, projectId } = useParams<{
    workspaceId?: string;
    projectId?: string;
  }>();

  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const user = useAuthStore((s) => s.user);
  const { title, section } = usePageTitle();
  const location = useLocation();

  // Presence
  const { onlineUsers } = usePresence(workspaceId ?? '', projectId);
  const otherUsers = onlineUsers.filter((u) => u.userId !== user?.id);

  // Global ⌘K handler (dispatched from QuickActionDock too)
  const handleSearchOpen = () => {
    if (onSearchOpen) {
      onSearchOpen();
    } else {
      // Fallback: dispatch keyboard event that App.tsx listens to
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true, bubbles: true }),
      );
    }
  };

  return (
    <header
      className="h-11 flex items-center justify-between px-4 flex-shrink-0
                 glass-topbar z-20 relative"
      role="banner"
    >
      {/* ── Left: breadcrumb ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {activeWorkspace && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeWorkspace.name}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden sm:flex items-center gap-1.5 min-w-0"
            >
              <span className="text-[11px] font-medium text-[#4B5563] truncate max-w-[120px]">
                {activeWorkspace.name}
              </span>
              {section && (
                <>
                  <ChevronRight className="w-3 h-3 text-[#374151] flex-shrink-0" />
                  <span className="text-[11px] text-[#374151] font-medium">{section}</span>
                </>
              )}
              <ChevronRight className="w-3 h-3 text-[#374151] flex-shrink-0" />
            </motion.div>
          </AnimatePresence>
        )}

        <AnimatePresence mode="wait">
          <motion.h1
            key={location.pathname}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.15 }}
            className="text-[13px] font-semibold text-[#F9FAFB] truncate"
          >
            {title}
          </motion.h1>
        </AnimatePresence>
      </div>

      {/* ── Center: Search pill ───────────────────────────────── */}
      <div className="flex-1 flex justify-center px-4">
        <SearchPill onClick={handleSearchOpen} />
      </div>

      {/* ── Right: Actions ────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* AI status */}
        <AIStatusBadge status="ready" showLabel={false} className="hidden sm:inline-flex" />

        {/* Collaborative presence */}
        {workspaceId && otherUsers.length > 0 && (
          <CollaborativePresence
            users={otherUsers.map((u) => ({
              userId: u.userId,
              name: u.name,
              avatar: u.avatar,
              projectId: u.projectId,
              context: u.projectId === projectId ? 'Here with you' : 'In workspace',
            }))}
            max={4}
          />
        )}

        {/* Notification bell */}
        <NotificationBell />

        {/* User avatar */}
        <Link
          to="/profile"
          id="topbar-user-avatar"
          title="Your Profile"
          className="relative flex-shrink-0 w-7 h-7 rounded-full overflow-hidden
                     ring-1 ring-[#374151] hover:ring-[#7C3AED]/60
                     transition-all duration-200 hover:scale-105"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-600 to-blue-600
                            flex items-center justify-center text-white text-[11px] font-bold">
              {(user?.name?.charAt(0) ?? user?.email?.charAt(0) ?? 'U').toUpperCase()}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
