import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import WorkspaceDashboard from './pages/workspace/WorkspaceDashboard';
import ProjectView from './pages/project/ProjectView';
import TasksView from './pages/project/TasksView';
import EditorView from './pages/editor/EditorView';
import SnippetsView from './pages/snippets/SnippetsView';
import WikiView from './pages/wiki/WikiView';
import ActivityFeedView from './pages/activity/ActivityFeedView';
import AIAssistantView from './pages/ai/AIAssistantView';
import SettingsView from './pages/settings/SettingsView';

function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/" element={<WorkspaceDashboard />} />
          <Route path="/:workspaceSlug" element={<WorkspaceDashboard />} />
          <Route path="/:workspaceSlug/projects" element={<ProjectView />} />
          <Route path="/:workspaceSlug/projects/:pid" element={<TasksView />} />
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
