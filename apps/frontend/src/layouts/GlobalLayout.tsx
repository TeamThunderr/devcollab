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
import LogoutButton from "../components/auth/LogoutButton";

export default function GlobalLayout(): React.ReactElement {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121316]">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#121316]">
      <Topbar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
        <LogoutButton isFloating={true} />
      </main>
    </div>
  );
}
