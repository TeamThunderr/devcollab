// TEMP — replace with real implementation (route guards, lazy loading, error boundaries)

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import useAuthStore from "./stores/authStore";

import AppLayout from "./layouts/AppLayout";
import AuthLayout from "./layouts/AuthLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import WorkspaceList from "./pages/workspace/WorkspaceList";
import WorkspaceDashboard from "./pages/workspace/WorkspaceDashboard";
import ProjectsPage from "./pages/project/ProjectsPage";
import TasksView from './pages/project/TasksView';
import EditorView from "./pages/editor/EditorView";
import SnippetsView from "./pages/snippets/SnippetsView";
import WikiView from "./pages/wiki/WikiView";
import ActivityFeedPage from "./pages/activity/ActivityFeedPage";
import AIAssistantView from "./pages/ai/AIAssistantView";
import SettingsView from "./pages/settings/SettingsView";
import BillingPage from "./pages/settings/BillingPage";

import ProtectedRoute from "./components/auth/ProtectedRoute";

function App(): React.ReactElement {
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  React.useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

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
          <Route path="/" element={<WorkspaceList />} />
          <Route path="/:workspaceId" element={<WorkspaceDashboard />} />
          <Route path="/:workspaceId/projects" element={<ProjectsPage />} />
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
