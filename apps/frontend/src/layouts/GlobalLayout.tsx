/**
 * src/layouts/GlobalLayout.tsx
 *
 * Topbar-only shell used for the /workspaces global route.
 * No sidebar — just the topbar with avatar + notification bell, then <Outlet />.
 */

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import Topbar from "../components/topbar/Topbar";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function GlobalLayout(): React.ReactElement {
  const { isAuthenticated, isInitialized } = useAuthStore();

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950">
      <Topbar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
