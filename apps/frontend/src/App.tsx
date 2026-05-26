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
import InviteAcceptPage from "./pages/workspace/InviteAcceptPage";

// ─── Global pages ─────────────────────────────────────────────────────────────
import WorkspaceList from "./pages/workspace/WorkspaceList";
import CreateWorkspaceOnboardingPage from "./pages/onboarding/CreateWorkspaceOnboardingPage";
import WelcomeOnboardingPage from "./pages/onboarding/WelcomeOnboardingPage";
import ProfilePage from "./pages/profile/ProfilePage";

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
import ProjectMembersPage from "./pages/project/ProjectMembersPage";

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

        {/* Public Invite Accept Route */}
        <Route path="/invite/:token" element={<InviteAcceptPage />} />

        {/* ── Onboarding Welcome (Standalone) ── */}
        <Route path="/onboarding/welcome" element={<WelcomeOnboardingPage />} />

        {/* ── Global protected shell: /workspaces ── */}
        <Route element={<GlobalLayout />}>
          <Route path="/workspaces" element={<WorkspaceList />} />
          <Route path="/onboarding/create-workspace" element={<CreateWorkspaceOnboardingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* ── Workspace-level routes: /w/:workspaceId/* ── */}
        <Route path="/w/:workspaceId" element={<WorkspaceLayout />}>
          <Route index element={<WorkspaceOverview />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="activity" element={<ActivityFeedPage />} />
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
            <Route path="ai" element={<AIAssistantView />} />
            <Route path="snippets" element={<SnippetsView />} />
            <Route path="snippets/:snippetId" element={<SnippetEditorPage />} />
            <Route path="wiki" element={<WikiView />} />
            <Route path="members" element={<ProjectMembersPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
