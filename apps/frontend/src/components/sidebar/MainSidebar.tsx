/**
 * src/components/sidebar/MainSidebar.tsx
 *
 * Dynamic sidebar. Uses URL params to decide which navigation level to render:
 *   Condition A — workspaceId exists, projectId does NOT → Workspace nav
 *   Condition B — both workspaceId AND projectId exist   → Project nav
 */

import React, { useMemo } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import useWorkspaceStore from "../../stores/workspaceStore";
import { useProjectStore } from "../../stores/projectStore";
import useAuthStore from "../../stores/authStore";
import { useBillingStore } from "../../stores/billingStore";
import useChatStore from "../../stores/chatStore";
import SubscriptionBadge from "../billing/SubscriptionBadge";
import { usePresence } from "../../hooks/usePresence";

// ─── Nav item types ───────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactElement;
  exact?: boolean;
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

const Icon = ({ d, ...rest }: { d: string; className?: string }) => (
  <svg
    className={rest.className ?? "w-4 h-4"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  projects:  "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
  members:   "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  billing:   "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  board:     "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2",
  wiki:      "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  snippets:  "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  editor:    "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  ai:        "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  activity:  "M13 10V3L4 14h7v7l9-11h-7z",
  back:      "M10 19l-7-7m0 0l7-7m-7 7h18",
};

// ─── Link component ───────────────────────────────────────────────────────────

function SidebarNavLink({ item }: { item: NavItem }) {
  const location = useLocation();

  const isActive = useMemo(() => {
    const [itemPath, itemQuery] = item.to.split('?');
    if (location.pathname !== itemPath) return false;

    const itemParams = new URLSearchParams(itemQuery || '');
    const currentParams = new URLSearchParams(location.search);

    const itemTab = itemParams.get('tab');
    const currentTab = currentParams.get('tab');

    // Snippets link is active only if currentTab is 'snippets'
    if (itemTab === 'snippets') {
      return currentTab === 'snippets';
    }

    // Board page container should be active if the tab is not 'snippets'
    if (itemPath.endsWith('/board')) {
      return currentTab !== 'snippets';
    }

    // Default exact match for other tabs/subpages (Wiki, Editor, etc.)
    return !itemTab && !currentTab;
  }, [location.pathname, location.search, item.to]);

  return (
    <Link
      to={item.to}
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 group border ${isActive
          ? "bg-white/[0.05] border-white/[0.04] text-white"
          : "border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]"
      }`}
    >
      <span className="flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MainSidebar(): React.ReactElement {
  const { workspaceId, projectId } = useParams<{
    workspaceId?: string;
    projectId?: string;
  }>();

  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const activeWorkspaceMember = useWorkspaceStore((s) => 
    s.members.find((m) => m.userId === user?.id)
  );
  const projects = useProjectStore((s) => s.projects);
  const { subscription } = useBillingStore();
  const setChatOpen = useChatStore((s) => s.setChatOpen);
  const unreadCount = useChatStore((s) => projectId ? (s.unreadCounts[projectId] || 0) : 0);

  const activeProject = projects.find((p) => p.id === projectId);
  const { onlineUsers } = usePresence(workspaceId || '', projectId);
  const projectOnlineUsers = onlineUsers.filter(u => u.userId !== user?.id && u.projectId === projectId);
  const isOwnerOrAdmin = activeWorkspaceMember?.role === "OWNER" || activeWorkspaceMember?.role === "ADMIN";

  // ── Condition B: Project-level navigation ────────────────────────────────
  if (workspaceId && projectId) {
    const projectNav: NavItem[] = [
      {
        label: "Board",
        to: `/w/${workspaceId}/p/${projectId}/board`,
        icon: <Icon d={ICONS.board} />,
      },
      {
        label: "Wiki",
        to: `/w/${workspaceId}/p/${projectId}/wiki`,
        icon: <Icon d={ICONS.wiki} />,
      },
      {
        label: "Snippets",
        to: `/w/${workspaceId}/p/${projectId}/board?tab=snippets`,
        icon: <Icon d={ICONS.snippets} />,
      },
      {
        label: "Editor",
        to: `/w/${workspaceId}/p/${projectId}/editor`,
        icon: <Icon d={ICONS.editor} />,
      },
      {
        label: "Members",
        to: `/w/${workspaceId}/p/${projectId}/members`,
        icon: <Icon d={ICONS.members} />,
      },
    ];

    return (
      <aside className="flex flex-col w-52 flex-shrink-0 bg-[#17191d] border-r border-white/[0.04] h-full">
        {/* Back to workspace */}
        <div className="px-3 pt-4 pb-3 border-b border-white/[0.04]">
          <button
            onClick={() => navigate(`/w/${workspaceId}/projects`)}
            className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-white transition-colors group w-full"
          >
            <Icon d={ICONS.back} className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Workspace
          </button>
        </div>

        {/* Project header */}
        <div className="px-4 py-4 border-b border-white/[0.04]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-extrabold mb-2 shadow-sm">
            {(activeProject?.name ?? "P").substring(0, 2).toUpperCase()}
          </div>
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Project</p>
          <h2 className="text-xs font-bold text-white mt-1.5 truncate" title={activeProject?.name}>
            {activeProject?.name ?? "Loading…"}
          </h2>
        </div>

        {/* Project nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {projectNav.map((item) => (
            <SidebarNavLink key={item.label} item={item} />
          ))}
          
          <button
            onClick={() => setChatOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 group border border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </span>
              Chat
            </div>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </nav>

        {/* Active Now section */}
        {projectOnlineUsers.length > 0 && (
          <div className="border-t border-white/[0.04] py-2">
            <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-4 py-1.5">
              Active Now
            </h3>
            <div className="space-y-1">
              {projectOnlineUsers.slice(0, 5).map(u => (
                <div key={u.userId} className="flex items-center gap-2 px-4 py-1.5 group cursor-default">
                  <div className="relative flex-shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover ring-1 ring-white/[0.04]" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white ring-1 ring-white/[0.04]">
                        {(u.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-green-400 rounded-full ring-1 ring-[#17191d]"></span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors truncate">
                      {u.name}
                    </span>
                  </div>
                </div>
              ))}
              {projectOnlineUsers.length > 5 && (
                <div className="px-4 py-1 text-[10px] text-slate-500 font-medium">
                  +{projectOnlineUsers.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* User footer */}
        <UserFooter user={user} onLogout={async () => { await logout(); navigate("/login"); }} />
      </aside>
    );
  }

  // ── Condition A: Workspace-level navigation ──────────────────────────────

  const workspaceNav: NavItem[] = workspaceId
    ? [
        {
          label: "Overview",
          to: `/w/${workspaceId}`,
          icon: <Icon d={ICONS.dashboard} />,
          exact: true,
        },
        {
          label: "Projects",
          to: `/w/${workspaceId}/projects`,
          icon: <Icon d={ICONS.projects} />,
        },
        {
          label: "Snippets",
          to: `/w/${workspaceId}/snippets`,
          icon: <Icon d={ICONS.snippets} />,
        },
        ...(isOwnerOrAdmin
          ? [
              {
                label: "Members",
                to: `/w/${workspaceId}/members`,
                icon: <Icon d={ICONS.members} />,
              },
              {
                label: "Billing",
                to: `/w/${workspaceId}/billing`,
                icon: <Icon d={ICONS.billing} />,
              },
            ]
          : []),
      ]
    : [];

  return (
    <aside className="flex flex-col w-52 flex-shrink-0 bg-[#17191d] border-r border-white/[0.04] h-full">
      {/* Logo — always routes to /workspaces */}
      <div className="px-4 py-4 border-b border-white/[0.04] flex items-center justify-between">
        <Link to="/workspaces" className="flex items-center gap-2 group">
          <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-[10px] font-black">DC</span>
          </div>
          <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
            DevCollab
          </span>
        </Link>
        {subscription?.plan === "PRO" && <SubscriptionBadge plan="PRO" />}
      </div>

      {/* ← All Workspaces back link */}
      <div className="px-3 pt-3 pb-2">
        <Link
          to="/workspaces"
          className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-white transition-colors group w-fit"
        >
          <svg className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          All Workspaces
        </Link>
      </div>

      {/* Workspace header */}
      {activeWorkspace && (
        <div className="px-4 py-2 border-b border-white/[0.04]">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">
            Workspace
          </p>
          <h2 className="text-xs font-bold text-white truncate" title={activeWorkspace.name}>
            {activeWorkspace.name}
          </h2>
        </div>
      )}

      {/* Workspace nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {workspaceNav.map((item) => (
          <SidebarNavLink key={item.label} item={item} />
        ))}
      </nav>

      {/* User footer */}
      <UserFooter user={user} onLogout={async () => { await logout(); navigate("/login"); }} />
    </aside>
  );
}

// ─── Shared footer ────────────────────────────────────────────────────────────

function UserFooter({
  user,
  onLogout,
}: {
  user: { name?: string | null; email: string } | null;
  onLogout: () => void;
}) {
  return (
    <div className="px-3 py-3 border-t border-white/[0.04] flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          {(user?.name ?? user?.email ?? "U").substring(0, 1).toUpperCase()}
        </div>
        <span className="text-[11px] font-semibold text-slate-300 truncate">{user?.name ?? user?.email}</span>
      </div>
      <button
        onClick={onLogout}
        title="Logout"
        className="text-slate-400 hover:text-white transition-colors flex-shrink-0 animate-in fade-in"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}
