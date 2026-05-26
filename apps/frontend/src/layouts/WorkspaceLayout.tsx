/**
 * src/layouts/WorkspaceLayout.tsx
 *
 * Workspace-level layout with PageTransition wrapper and QuickActionDock.
 */

import React, { useEffect } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useWorkspaceStore from '../stores/workspaceStore';
import { useProjectStore } from '../stores/projectStore';
import { useBillingStore } from '../stores/billingStore';
import { connectSocket } from '../lib/socket';
import MainSidebar from '../components/sidebar/MainSidebar';
import Topbar from '../components/topbar/Topbar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PageTransition from '../components/ui/PageTransition';
import QuickActionDock from '../components/ui/QuickActionDock';
import AmbientBackground from '../components/ui/AmbientBackground';
import { useCursorGlow } from '../hooks/useCursorGlow';

export default function WorkspaceLayout(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { fetchWorkspaceDetails } = useWorkspaceStore();
  const { fetchProjects } = useProjectStore();
  const { fetchSubscription } = useBillingStore();

  // Register global cursor tracking for glow effects
  useCursorGlow();

  useEffect(() => {
    if (isInitialized && isAuthenticated && workspaceId) {
      fetchWorkspaceDetails(workspaceId).catch(console.error);
      fetchProjects(workspaceId).catch(console.error);
      fetchSubscription(workspaceId).catch(console.error);

      const token = useAuthStore.getState().accessToken;
      if (token) {
        connectSocket(token, workspaceId);
      }
    }
    // NOTE: Do NOT call disconnectSocket() on cleanup here.
    // The socket must stay alive for the full workspace session.
  }, [workspaceId, isInitialized, isAuthenticated, fetchWorkspaceDetails, fetchProjects, fetchSubscription]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1020]">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B1020]">
      <MainSidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        {/* Ambient background motion */}
        <AmbientBackground />

        <Topbar />

        <main className="flex-1 overflow-y-auto relative z-10">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      {/* Floating quick action dock */}
      <QuickActionDock />
    </div>
  );
}
