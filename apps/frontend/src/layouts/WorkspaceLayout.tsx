/**
 * src/layouts/WorkspaceLayout.tsx
 *
 * Workspace-level layout (Condition A sidebar).
 * Fetches workspace details + subscription on mount, then renders
 * MainSidebar on the left and <Outlet /> on the right.
 */

import React, { useEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import useWorkspaceStore from "../stores/workspaceStore";
import { useProjectStore } from "../stores/projectStore";
import { useBillingStore } from "../stores/billingStore";
import MainSidebar from "../components/sidebar/MainSidebar";
import Topbar from "../components/topbar/Topbar";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function WorkspaceLayout(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { fetchWorkspaceDetails } = useWorkspaceStore();
  const { fetchProjects } = useProjectStore();
  const { fetchSubscription } = useBillingStore();

  useEffect(() => {
    if (isInitialized && isAuthenticated && workspaceId) {
      fetchWorkspaceDetails(workspaceId).catch(console.error);
      fetchProjects(workspaceId).catch(console.error);
      fetchSubscription(workspaceId).catch(console.error);
    }
  }, [workspaceId, isInitialized, isAuthenticated, fetchWorkspaceDetails, fetchProjects, fetchSubscription]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Condition A sidebar */}
      <MainSidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-slate-950">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
