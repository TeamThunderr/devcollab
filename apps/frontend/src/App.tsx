// TEMP — replace with real implementation (route guards, lazy loading, error boundaries)

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./stores/authStore";

import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import WorkspaceList from "./pages/workspace/WorkspaceList";
import WorkspaceDashboardPage from "./pages/workspace/WorkspaceDashboardPage";
import WorkspaceSettingsPage from "./pages/workspace/WorkspaceSettingsPage";
import CreateWorkspaceOnboardingPage from "./pages/onboarding/CreateWorkspaceOnboardingPage";
import ProjectView from "./pages/project/ProjectView";
import TasksView from './pages/project/TasksView';
import EditorView from "./pages/editor/EditorView";
import SnippetsView from "./pages/snippets/SnippetsView";
import WikiView from "./pages/wiki/WikiView";
import ActivityFeedPage from "./pages/activity/ActivityFeedPage";
import AIAssistantView from "./pages/ai/AIAssistantView";
import SettingsView from "./pages/settings/SettingsView";
import BillingPage from "./pages/settings/BillingPage";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import InviteAcceptPage from "./pages/workspace/InviteAcceptPage";

function App(): React.ReactElement {
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  React.useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Public Invite Accept Route */}
        <Route path="/invite/:token" element={<InviteAcceptPage />} />

        {/* Protected app routes — AppLayout handles its own guard too */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<WorkspaceList />} />
          <Route path="/onboarding/create-workspace" element={<CreateWorkspaceOnboardingPage />} />
          <Route path="/:workspaceId" element={<Navigate to="dashboard" replace />} />
          <Route path="/:workspaceId/dashboard" element={<WorkspaceDashboardPage />} />
          <Route path="/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
          <Route path="/:workspaceId/projects" element={<ProjectView />} />
          <Route path="/:workspaceId/projects/:pid" element={<TasksView />} />
          <Route path="/:workspaceId/editor/:pid" element={<EditorView />} />
          <Route path="/:workspaceId/snippets/:pid" element={<SnippetsView />} />
          <Route path="/:workspaceId/wiki/:pid" element={<WikiView />} />
          <Route path="/:workspaceId/activity" element={<ActivityFeedPage />} />
          <Route path="/:workspaceId/ai" element={<AIAssistantView />} />
          <Route path="/:workspaceId/settings/billing" element={<BillingPage />} />
          <Route path="/settings" element={<SettingsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
