// TEMP — replace with real implementation (real sidebar with workspace data, active nav state)

import React from "react";
import { Link, Outlet, useNavigate, Navigate, useParams, useLocation } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import Topbar from "../components/topbar/Topbar";
import WorkspaceSwitcher from "../components/workspace/WorkspaceSwitcher";

const NAV_ITEMS = [
  { emoji: "🏠", label: "Dashboard", getTo: (wid: string) => `/${wid}` },
  { emoji: "📋", label: "Project", getTo: (wid: string) => `/${wid}/projects/project-test-456` },
  { emoji: "✏️", label: "Editor", getTo: (wid: string) => `/${wid}/editor/project-test-456` },
  { emoji: "📝", label: "Wiki", getTo: (wid: string) => `/${wid}/wiki/project-test-456` },
  { emoji: "💾", label: "Snippets", getTo: (wid: string) => `/${wid}/snippets/project-test-456` },
  { emoji: "📊", label: "Activity", getTo: (wid: string) => `/${wid}/activity` },
  { emoji: "🤖", label: "AI Assistant", getTo: (wid: string) => `/${wid}/ai` },
] as const;

export default function AppLayout(): React.ReactElement {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();

  // Auth guard — redirect unauthenticated users to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden
                    bg-gray-50 dark:bg-gray-950">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col w-[220px] flex-shrink-0
                   bg-gray-950 text-white
                   border-r border-gray-800"
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-white cursor-pointer" onClick={() => navigate('/')}>
            DevCollab
          </span>
        </div>

        {/* Workspace Switcher */}
        <div className="px-3 py-3 border-b border-gray-800">
          <WorkspaceSwitcher />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {workspaceId ? (
            <ul className="space-y-0.5 px-2">
              {NAV_ITEMS.map((item) => {
                const to = item.getTo(workspaceId);
                const isActive = location.pathname === to || (item.label !== 'Dashboard' && location.pathname.startsWith(to.split('/project-test-456')[0]));
                return (
                  <li key={item.label}>
                    <Link
                      to={to}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150
                        ${isActive ? 'bg-gray-800 text-white font-medium' : 'text-gray-300 hover:text-white hover:bg-gray-800/50'}`}
                    >
                      <span aria-hidden="true">{item.emoji}</span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-4 text-xs text-gray-500">
              Select a workspace to view its tools.
            </div>
          )}
        </nav>

        {/* Bottom — user + logout */}
        <div className="px-4 py-4 border-t border-gray-800">
          {user && (
            <p className="text-xs text-gray-400 truncate mb-2">
              {user.name}
            </p>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-xs text-left px-3 py-2 rounded-lg
                       text-gray-400 hover:text-white
                       hover:bg-gray-800 transition-colors duration-150"
          >
            ← Logout
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
