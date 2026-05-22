// TEMP — replace with real implementation (real sidebar with workspace data, active nav state)

import React from "react";
import { Link, Outlet, useNavigate, Navigate, NavLink, useParams } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import { disconnectSocket } from "../lib/socket";
import Topbar from "../components/topbar/Topbar";

const NAV_ITEMS = [
  { emoji: "🏠", label: "Dashboard", to: "/" },
  { emoji: "📋", label: "Project", to: "/test-workspace/projects/project-test-456" },
  { emoji: "✏️", label: "Editor", to: "/test-workspace/editor/project-test-456" },
  { emoji: "📝", label: "Wiki", to: "/test-workspace/wiki/project-test-456" },
  { emoji: "💾", label: "Snippets", to: "/test-workspace/snippets/project-test-456" },
  { emoji: "📊", label: "Activity", to: "/test-workspace/activity" },
  { emoji: "🤖", label: "AI Assistant", to: "/test-workspace/ai" },
] as const;

export default function AppLayout(): React.ReactElement {
  const { workspaceSlug = 'default-workspace' } = useParams<{ workspaceSlug: string }>();

  const navigate = useNavigate();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  // Auth guard — redirect unauthenticated users to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  function handleLogout(): void {
    clearAuth();
    disconnectSocket();
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
        <div className="px-5 py-5 border-b border-gray-800">
          <span className="text-lg font-bold tracking-tight text-white">
            DevCollab
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg
                             text-sm text-gray-300 hover:text-white
                             hover:bg-gray-800 transition-colors duration-150"
                >
                  <span aria-hidden="true">{item.emoji}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
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
