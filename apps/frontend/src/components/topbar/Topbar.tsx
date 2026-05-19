/**
 * apps/frontend/src/components/topbar/Topbar.tsx
 *
 * Application topbar. Left: dynamic page title. Right: online avatars,
 * notification bell.
 */

import React from "react";
import { useLocation, useParams } from "react-router-dom";
import useWorkspaceStore from "../../stores/workspaceStore";
import OnlineAvatars from "../presence/OnlineAvatars";
import NotificationBell from "../notifications/NotificationBell";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derive a page title from the current pathname.
 * Matches route patterns in order of specificity.
 */
function usePageTitle(workspaceName: string): string {
  const location = useLocation();
  const path = location.pathname;

  if (path.includes("/activity")) return "Activity Feed";
  if (path.includes("/ai")) return "AI Assistant";
  if (path.includes("/editor")) return "Code Editor";
  if (path.includes("/snippets")) return "Snippets";
  if (path.includes("/wiki")) return "Wiki";
  if (path.includes("/projects/")) return "Project Board";

  return workspaceName || "DevCollab";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Topbar(): React.ReactElement {
  // workspaceStore is still being built; access whatever is available safely
  const workspace = useWorkspaceStore((s) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s as unknown as Record<string, any>).currentWorkspace ?? null
  );

  const workspaceName: string =
    workspace?.name ?? workspace?.title ?? "DevCollab";
  const workspaceId: string = workspace?.id ?? "";

  const { projectId } = useParams<{ projectId?: string }>();
  const pageTitle = usePageTitle(workspaceName);

  return (
    <header
      className="h-14 flex items-center justify-between px-6
                 bg-white dark:bg-gray-950
                 border-b border-gray-200 dark:border-gray-800
                 flex-shrink-0"
    >
      {/* Left — page title */}
      <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
        {pageTitle}
      </h1>

      {/* Right — actions */}
      <div className="flex items-center gap-3">
        {/* Online avatars (only shown when we have a workspaceId) */}
        {workspaceId && (
          <OnlineAvatars
            workspaceId={workspaceId}
            projectId={projectId}
          />
        )}

        {/* Notification bell */}
        <NotificationBell />
      </div>
    </header>
  );
}
