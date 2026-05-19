// TEMP — replace with real implementation (route guards, lazy loading, error boundaries)

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./stores/authStore";

import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import WorkspaceDashboard from "./pages/workspace/WorkspaceDashboard";
import ProjectView from "./pages/project/ProjectView";
import EditorView from "./pages/editor/EditorView";
import SnippetsView from "./pages/snippets/SnippetsView";
import WikiView from "./pages/wiki/WikiView";
import ActivityFeedView from "./pages/activity/ActivityFeedView";
import AIAssistantView from "./pages/ai/AIAssistantView";
import SettingsView from "./pages/settings/SettingsView";

/**
 * ProtectedRoute — redirects to /login if not authenticated.
 * AppLayout also guards itself, but this gives a clean outer redirect
 * so unauthenticated direct URL hits don't flash layout chrome.
 */
function ProtectedRoute({
  children,
}: {
  children: React.ReactElement;
}): React.ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function App(): React.ReactElement {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        {/* Public auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected app routes — AppLayout handles its own guard too */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<WorkspaceDashboard />} />
          <Route path="/:workspaceSlug" element={<WorkspaceDashboard />} />
          <Route path="/:workspaceSlug/projects/:pid" element={<ProjectView />} />
          <Route path="/:workspaceSlug/editor/:pid" element={<EditorView />} />
          <Route path="/:workspaceSlug/snippets/:pid" element={<SnippetsView />} />
          <Route path="/:workspaceSlug/wiki/:pid" element={<WikiView />} />
          <Route path="/:workspaceSlug/activity" element={<ActivityFeedView />} />
          <Route path="/:workspaceSlug/ai" element={<AIAssistantView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
