/**
 * src/components/sidebar/MainSidebar.tsx
 *
 * Premium collapsible sidebar.
 * Condition A — workspace-level navigation
 * Condition B — project-level navigation
 *
 * Features:
 *  • Collapse to icon-only mode (64px) with tooltip labels
 *  • Active nav item: violet left border + glow background
 *  • Smooth hover animations via Framer Motion
 *  • AI Tools section with special indicator
 *  • Collaborative presence in project mode
 *  • Spring-based collapse transition
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, FolderOpen, Users, CreditCard, Kanban, BookOpen,
  Code2, Activity, Sparkles, MessageSquare, ArrowLeft,
  ChevronLeft, ChevronRight, Settings,
} from 'lucide-react';
import useWorkspaceStore from '../../stores/workspaceStore';
import { useProjectStore } from '../../stores/projectStore';
import useAuthStore from '../../stores/authStore';
import { useBillingStore } from '../../stores/billingStore';
import useChatStore from '../../stores/chatStore';
import { usePresence } from '../../hooks/usePresence';
import LogoutButton from '../auth/LogoutButton';
import { cn } from '../../lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  badge?: number;
  exact?: boolean;
  isAI?: boolean;
}

// ─── NavLink ───────────────────────────────────────────────────────────────────

function SidebarNavLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const location = useLocation();

  const isActive = useMemo(() => {
    const [itemPath, itemQuery] = item.to.split('?');
    if (location.pathname !== itemPath) {
      if (!item.exact && location.pathname.startsWith(itemPath) && itemPath !== '/') return true;
      return false;
    }
    const itemParams = new URLSearchParams(itemQuery || '');
    const currentParams = new URLSearchParams(location.search);
    const itemTab = itemParams.get('tab');
    const currentTab = currentParams.get('tab');
    if (itemTab === 'snippets') return currentTab === 'snippets';
    if (itemPath.endsWith('/board')) return currentTab !== 'snippets';
    return !itemTab && !currentTab;
  }, [location.pathname, location.search, item.to, item.exact]);

  const inner = (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn(
        'relative flex items-center gap-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
        collapsed ? 'justify-center w-9 h-9 mx-auto' : 'px-3 py-2 w-full',
        isActive
          ? 'bg-[#7C3AED]/15 text-white border-l-2 border-[#7C3AED]'
          : 'text-[#9CA3AF] hover:text-white hover:bg-white/[0.04] border-l-2 border-transparent',
      )}
    >
      {/* AI tool glow */}
      {item.isAI && isActive && (
        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C3AED]/10 to-transparent" />
      )}

      <span className={cn('flex-shrink-0 relative z-10', isActive ? 'text-[#A78BFA]' : '')}>
        {item.icon}
      </span>

      {!collapsed && (
        <span className="relative z-10 truncate">{item.label}</span>
      )}

      {/* Badge */}
      {item.badge !== undefined && item.badge > 0 && !collapsed && (
        <span className="ml-auto bg-[#3B82F6] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}

      {/* Active indicator dot in collapsed mode */}
      {collapsed && isActive && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-l-full bg-[#7C3AED]" />
      )}
    </Link>
  );

  if (!collapsed) return inner;

  // Tooltip for collapsed mode
  return (
    <div className="relative group/tooltip">
      {inner}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50
                      pointer-events-none opacity-0 group-hover/tooltip:opacity-100
                      transition-opacity duration-150">
        <div className="whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-semibold
                        text-white bg-[#1F2937] border border-[#374151] shadow-xl">
          {item.label}
          {item.badge !== undefined && item.badge > 0 && (
            <span className="ml-2 bg-[#3B82F6] text-white text-[9px] px-1 rounded-full">
              {item.badge}
            </span>
          )}
        </div>
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#374151]" />
      </div>
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function NavSection({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="h-px bg-[#1F2937] mx-2 my-2" />;
  return (
    <p className="px-3 py-1 text-[9px] font-black text-[#4B5563] uppercase tracking-[0.12em] mt-4 mb-1">
      {label}
    </p>
  );
}

// ─── Logo ──────────────────────────────────────────────────────────────────────

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link to="/workspaces" className="flex items-center gap-2.5 group flex-shrink-0">
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600
                      flex items-center justify-center shadow-[0_0_16px_rgba(124,58,237,0.35)]
                      flex-shrink-0 group-hover:shadow-[0_0_24px_rgba(124,58,237,0.5)]
                      transition-shadow duration-300">
        <span className="text-white text-[11px] font-black">DC</span>
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[13px] font-bold text-white group-hover:text-gradient-ai
                       overflow-hidden whitespace-nowrap"
          >
            DevCollab
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

// ─── User footer ───────────────────────────────────────────────────────────────

function UserFooter({
  user,
  collapsed,
}: {
  user: { name?: string | null; email: string; avatar?: string | null } | null;
  collapsed: boolean;
}) {
  const initial = (user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase();

  return (
    <div className={cn(
      'border-t border-[#1F2937] py-3 flex flex-col gap-2',
      collapsed ? 'px-2 items-center' : 'px-3',
    )}>
      <div className={cn('flex items-center gap-2.5 min-w-0', collapsed && 'justify-center')}>
        <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden
                        ring-1 ring-[#374151] flex items-center justify-center
                        bg-gradient-to-br from-violet-600 to-blue-600">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name ?? ''} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-[10px] font-bold">{initial}</span>
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[#F9FAFB] truncate">
              {user?.name ?? user?.email}
            </p>
            {user?.name && (
              <p className="text-[9px] text-[#4B5563] truncate">{user.email}</p>
            )}
          </div>
        )}
      </div>
      {!collapsed && <LogoutButton />}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function MainSidebar(): React.ReactElement {
  const { workspaceId, projectId } = useParams<{
    workspaceId?: string;
    projectId?: string;
  }>();

  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const activeWorkspaceMember = useWorkspaceStore((s) =>
    s.members.find((m) => m.userId === user?.id),
  );
  const projects = useProjectStore((s) => s.projects);
  const { subscription } = useBillingStore();
  const setChatOpen = useChatStore((s) => s.setChatOpen);
  const unreadCount = useChatStore((s) =>
    projectId ? s.unreadCounts[projectId] || 0 : 0,
  );

  const activeProject = projects.find((p) => p.id === projectId);
  const { onlineUsers } = usePresence(workspaceId || '', projectId);
  const projectOnlineUsers = onlineUsers.filter(
    (u) => u.userId !== user?.id && u.projectId === projectId,
  );
  const isOwnerOrAdmin =
    activeWorkspaceMember?.role === 'OWNER' ||
    activeWorkspaceMember?.role === 'ADMIN';

  const sidebarWidth = collapsed ? 64 : 208;

  const projectMembers = useProjectStore((s) => s.projectMembers);
  const activeProjMembers = projectId ? (projectMembers[projectId] || []) : [];

  const getMemberRole = (userId: string): string => {
    const wsMember = useWorkspaceStore.getState().members.find(m => m.userId === userId);
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

  const isViewer = user ? getMemberRole(user.id) === 'Viewer' : false;

  // ── Condition B: Project nav ──────────────────────────────────────────────

  if (workspaceId && projectId) {
    const projectNav: NavItem[] = [
      { label: 'Board',       to: `/w/${workspaceId}/p/${projectId}/board`,         icon: <Kanban className="w-4 h-4" />    },
      { label: 'Activity',    to: `/w/${workspaceId}/p/${projectId}/activity`,      icon: <Activity className="w-4 h-4" />  },
      { label: 'Wiki',        to: `/w/${workspaceId}/p/${projectId}/wiki`,          icon: <BookOpen className="w-4 h-4" />  },
      { label: 'Snippets',    to: `/w/${workspaceId}/p/${projectId}/board?tab=snippets`, icon: <Code2 className="w-4 h-4" />    },
      { label: 'Editor',      to: `/w/${workspaceId}/p/${projectId}/editor`,        icon: <Code2 className="w-4 h-4" />     },
      { label: 'AI Assistant',to: `/w/${workspaceId}/p/${projectId}/ai`,            icon: <Sparkles className="w-4 h-4" />, isAI: true },
      { label: 'Members',     to: `/w/${workspaceId}/p/${projectId}/members`,       icon: <Users className="w-4 h-4" />     },
    ].filter(item => {
      if (isViewer) {
        return item.label === "Board" || item.label === "Activity";
      }
      return true;
    });

    return (
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="relative flex flex-col flex-shrink-0 bg-[#0F1629] border-r border-[#1F2937] h-full overflow-hidden"
        style={{ minWidth: sidebarWidth }}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          id="sidebar-collapse-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-14 z-50 w-6 h-6 rounded-full
                     bg-[#1F2937] border border-[#374151] flex items-center justify-center
                     text-[#9CA3AF] hover:text-white hover:bg-[#374151]
                     transition-all duration-200 shadow-lg"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Header */}
        <div className={cn('flex-shrink-0 border-b border-[#1F2937] py-4', collapsed ? 'px-2' : 'px-4')}>
          <SidebarLogo collapsed={collapsed} />
        </div>

        {/* Back + project header */}
        {!collapsed && (
          <>
            <div className="px-3 pt-3 pb-2">
              <button
                onClick={() => navigate(`/w/${workspaceId}/projects`)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-[#4B5563]
                           hover:text-white transition-colors group"
              >
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                Back to Workspace
              </button>
            </div>
            <div className="px-4 pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
                                flex items-center justify-center text-white text-[10px] font-extrabold
                                shadow-[0_0_12px_rgba(124,58,237,0.3)] flex-shrink-0">
                  {(activeProject?.name ?? 'P').substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-[#4B5563] uppercase tracking-widest">Project</p>
                  <h2 className="text-xs font-bold text-white truncate">{activeProject?.name ?? 'Loading…'}</h2>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Project nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {projectNav.map((item) => (
            <SidebarNavLink key={item.label} item={item} collapsed={collapsed} />
          ))}

          {/* Chat button */}
          {!isViewer && (
          <div className="relative group/tooltip">
            <button
              onClick={() => setChatOpen(true)}
              id="nav-chat"
              aria-label="Team Chat"
              className={cn(
                'flex items-center gap-2.5 rounded-xl text-xs font-semibold transition-all duration-150',
                'text-[#9CA3AF] hover:text-white hover:bg-white/[0.04] border-l-2 border-transparent',
                collapsed ? 'justify-center w-9 h-9 mx-auto' : 'px-3 py-2 w-full',
              )}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Chat</span>}
              {unreadCount > 0 && !collapsed && (
                <span className="ml-auto bg-[#3B82F6] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
              {unreadCount > 0 && collapsed && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-[#3B82F6] rounded-full" />
              )}
            </button>
            {collapsed && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50
                              pointer-events-none opacity-0 group-hover/tooltip:opacity-100
                              transition-opacity duration-150">
                <div className="whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                text-white bg-[#1F2937] border border-[#374151] shadow-xl">
                  Chat {unreadCount > 0 && `(${unreadCount})`}
                </div>
              </div>
            )}
          </div>
          )}
        </nav>

        {/* Active Now */}
        {projectOnlineUsers.length > 0 && !collapsed && (
          <div className="border-t border-[#1F2937] py-2">
            <h3 className="text-[9px] font-extrabold text-[#4B5563] uppercase tracking-widest px-4 py-1">
              Active Now
            </h3>
            <div className="space-y-0.5 px-2">
              {projectOnlineUsers.slice(0, 4).map((u) => (
                <div key={u.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
                  <div className="relative flex-shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-5.5 h-5.5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[#7C3AED] flex items-center justify-center text-[9px] font-bold text-white">
                        {(u.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full ring-1 ring-[#0F1629]" />
                  </div>
                  <span className="text-[11px] font-medium text-[#9CA3AF] truncate">{u.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <UserFooter user={user} collapsed={collapsed} />
      </motion.aside>
    );
  }

  // ── Condition A: Workspace nav ────────────────────────────────────────────

  const workspaceNav: NavItem[] = workspaceId
    ? [
        { label: 'Overview', to: `/w/${workspaceId}`,          icon: <Home className="w-4 h-4" />,        exact: true },
        { label: 'Projects', to: `/w/${workspaceId}/projects`, icon: <FolderOpen className="w-4 h-4" />              },
        { label: 'Activity', to: `/w/${workspaceId}/activity`, icon: <Activity className="w-4 h-4" />               },
        ...(isOwnerOrAdmin
          ? [
              { label: 'Members', to: `/w/${workspaceId}/members`, icon: <Users className="w-4 h-4" />  },
              { label: 'Billing', to: `/w/${workspaceId}/billing`, icon: <CreditCard className="w-4 h-4" /> },
              { label: 'Settings',to: `/w/${workspaceId}/settings`,icon: <Settings className="w-4 h-4" /> },
            ]
          : []),
      ]
    : [];

  return (
    <motion.aside
      animate={{ width: sidebarWidth }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="relative flex flex-col flex-shrink-0 bg-[#0F1629] border-r border-[#1F2937] h-full overflow-hidden"
      style={{ minWidth: sidebarWidth }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        id="sidebar-collapse-toggle"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-14 z-50 w-6 h-6 rounded-full
                   bg-[#1F2937] border border-[#374151] flex items-center justify-center
                   text-[#9CA3AF] hover:text-white hover:bg-[#374151]
                   transition-all duration-200 shadow-lg"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Logo */}
      <div className={cn('flex-shrink-0 border-b border-[#1F2937] py-4', collapsed ? 'px-2' : 'px-4')}>
        <SidebarLogo collapsed={collapsed} />
        {!collapsed && subscription?.plan === 'PRO' && (
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold
                             bg-gradient-to-r from-violet-600 to-blue-600 text-white tracking-wider">
              PRO
            </span>
          </div>
        )}
      </div>

      {/* Workspace label */}
      {!collapsed && activeWorkspace && (
        <div className="px-4 py-3 border-b border-[#1F2937]">
          <p className="text-[9px] font-extrabold text-[#4B5563] uppercase tracking-widest mb-0.5">
            Workspace
          </p>
          <h2 className="text-xs font-bold text-white truncate" title={activeWorkspace.name}>
            {activeWorkspace.name}
          </h2>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!collapsed && <NavSection label="Navigation" collapsed={collapsed} />}
        {workspaceNav.slice(0, 3).map((item) => (
          <SidebarNavLink key={item.label} item={item} collapsed={collapsed} />
        ))}

        {isOwnerOrAdmin && workspaceNav.length > 3 && (
          <>
            {!collapsed && <NavSection label="Admin" collapsed={collapsed} />}
            {workspaceNav.slice(3).map((item) => (
              <SidebarNavLink key={item.label} item={item} collapsed={collapsed} />
            ))}
          </>
        )}

        {/* AI section */}
        {!collapsed && <NavSection label="Intelligence" collapsed={collapsed} />}
        {projects.slice(0, 3).map((project) => (
          <SidebarNavLink
            key={project.id}
            collapsed={collapsed}
            item={{
              label: project.name,
              to: `/w/${workspaceId}/p/${project.id}/ai`,
              icon: <Sparkles className="w-4 h-4" />,
              isAI: true,
            }}
          />
        ))}
      </nav>

      <UserFooter user={user} collapsed={collapsed} />
    </motion.aside>
  );
}
