import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import useAuthStore from "./stores/authStore";

// ─── Layouts ──────────────────────────────────────────────────────────────────
import AuthLayout from "./layouts/AuthLayout";
import GlobalLayout from "./layouts/GlobalLayout";
import WorkspaceLayout from "./layouts/WorkspaceLayout";
import ProjectLayout from "./layouts/ProjectLayout";

// ─── Auth pages ───────────────────────────────────────────────────────────────
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// ─── Global pages ─────────────────────────────────────────────────────────────
import WorkspaceList from "./pages/workspace/WorkspaceList";

// ─── Workspace pages ──────────────────────────────────────────────────────────
import WorkspaceOverview from "./pages/workspace/WorkspaceOverview";
import ProjectsPage from "./pages/project/ProjectsPage";
import ActivityFeedPage from "./pages/activity/ActivityFeedPage";
import AIAssistantView from "./pages/ai/AIAssistantView";
import MembersPage from "./pages/workspace/MembersPage";
import BillingPage from "./pages/settings/BillingPage";
import SettingsView from "./pages/settings/SettingsView";

// ─── Project pages ────────────────────────────────────────────────────────────
import TasksView from "./pages/project/TasksView";
import EditorView from "./pages/editor/EditorView";
import SnippetsView from "./pages/snippets/SnippetsView";
import SnippetEditorPage from "./pages/snippets/SnippetEditorPage";
import WikiView from "./pages/wiki/WikiView";

// ─── Root redirect ────────────────────────────────────────────────────────────

/** Redirect / based on auth state: authenticated → /workspaces, else → /login */
function RootRedirect(): React.ReactElement {
  const { isAuthenticated, isInitialized } = useAuthStore();
  if (!isInitialized) return <></>;
  return <Navigate to={isAuthenticated ? "/workspaces" : "/login"} replace />;
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App(): React.ReactElement {
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

  React.useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* ── Root: smart redirect ── */}
        <Route path="/" element={<RootRedirect />} />

        {/* ── Public auth routes ── */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* ── Global protected shell: /workspaces ── */}
        <Route element={<GlobalLayout />}>
          <Route path="/workspaces" element={<WorkspaceList />} />
        </Route>

        {/* ── Workspace-level routes: /w/:workspaceId/* ── */}
        <Route path="/w/:workspaceId" element={<WorkspaceLayout />}>
          <Route index element={<WorkspaceOverview />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="activity" element={<ActivityFeedPage />} />
          <Route path="ai" element={<AIAssistantView />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="snippets" element={<SnippetsView />} />
          <Route path="snippets/:snippetId" element={<SnippetEditorPage />} />

          {/* ── Project-level routes: /w/:workspaceId/p/:projectId/* ── */}
          <Route path="p/:projectId" element={<ProjectLayout />}>
            <Route index element={<Navigate to="board" replace />} />
            <Route path="board" element={<TasksView />} />
            <Route path="editor" element={<EditorView />} />
            <Route path="snippets" element={<SnippetsView />} />
            <Route path="snippets/:snippetId" element={<SnippetEditorPage />} />
            <Route path="wiki" element={<WikiView />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
