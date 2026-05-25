/**
 * src/components/topbar/Topbar.tsx
 *
 * Application topbar. Left: dynamic page title derived from new URL structure.
 * Right: online presence avatars + notification bell.
 */

import React from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import useWorkspaceStore from "../../stores/workspaceStore";
import useAuthStore from "../../stores/authStore";
import OnlineAvatars from "../presence/OnlineAvatars";
import NotificationBell from "../notifications/NotificationBell";

// ─── Page title helper ────────────────────────────────────────────────────────

function usePageTitle(): string {
  const location = useLocation();
  const { pathname } = location;

  // Project-level routes: /w/:workspaceId/p/:projectId/<feature>
  if (pathname.includes("/editor"))   return "Code Editor";
  if (pathname.includes("/snippets")) return "Snippets";
  if (pathname.includes("/wiki"))     return "Wiki";
  if (pathname.includes("/board"))    return "Project Board";

  // Workspace-level routes: /w/:workspaceId/<section>
  if (pathname.includes("/activity")) return "Activity Feed";
  if (pathname.includes("/ai"))       return "AI Assistant";
  if (pathname.includes("/members"))  return "Members";
  if (pathname.includes("/billing"))  return "Billing";
  if (pathname.includes("/settings")) return "Settings";
  if (pathname.includes("/projects")) return "Projects";

  // Global routes
  if (pathname === "/workspaces")     return "Your Workspaces";

  // Workspace dashboard (/ index under workspace)
  return "Dashboard";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Topbar(): React.ReactElement {
  const { workspaceId, projectId } = useParams<{
    workspaceId?: string;
    projectId?: string;
  }>();

  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const user = useAuthStore((s) => s.user);
  const pageTitle = usePageTitle();

  return (
    <header
      className="h-12 flex items-center justify-between px-5
                 bg-slate-950 border-b border-slate-800 flex-shrink-0"
    >
      {/* Left — breadcrumb / page title */}
      <div className="flex items-center gap-2 min-w-0">
        {activeWorkspace && (
          <>
            <span className="text-xs text-slate-500 font-medium truncate hidden sm:block">
              {activeWorkspace.name}
            </span>
            <span className="text-slate-700 text-xs hidden sm:block">/</span>
          </>
        )}
        <h1 className="text-sm font-semibold text-white truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {workspaceId && (
          <OnlineAvatars workspaceId={workspaceId} projectId={projectId} />
        )}
        <NotificationBell />
        <Link 
          to="/profile" 
          className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold hover:bg-blue-700 transition-colors ml-1 overflow-hidden"
          title="Your Profile"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'
          )}
        </Link>
      </div>
    </header>
  );
}
