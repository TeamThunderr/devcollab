import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useProjectStore } from "../../stores/projectStore";
import ProGate from "../../components/common/ProGate";
import CodeReviewPanel from "../../components/ai/CodeReviewPanel";
import ProjectSummaryPanel from "../../components/ai/ProjectSummaryPanel";
import StandupPanel from "../../components/ai/StandupPanel";
import TaskBreakdownPanel from "../../components/ai/TaskBreakdownPanel";

// ─── Panel wrapper ────────────────────────────────────────────────────────────

function PanelCard({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      className="bg-white dark:bg-gray-900
                 border border-gray-200 dark:border-gray-800
                 rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      {children}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function AIAssistantView(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { projects, fetchProjects, loading } = useProjectStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    if (workspaceId) {
      void fetchProjects(workspaceId);
    }
  }, [workspaceId, fetchProjects]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      // Try to read last selected project from sessionStorage
      const saved = sessionStorage.getItem(`devcollab_ai_project_${workspaceId}`);
      if (saved && projects.some(p => p.id === saved)) {
        setSelectedProjectId(saved);
      } else {
        setSelectedProjectId(projects[0].id);
      }
    }
  }, [projects, selectedProjectId, workspaceId]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProjectId(val);
    if (workspaceId) {
      sessionStorage.setItem(`devcollab_ai_project_${workspaceId}`, val);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🤖</span> AI Assistant
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Powered by Gemini — your intelligent project companion
          </p>
        </div>

        {/* Project Selector Dropdown */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="ai-project-select" className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Active Project:
            </label>
            <select
              id="ai-project-select"
              value={selectedProjectId}
              onChange={handleProjectChange}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                         rounded-xl px-3 py-1.5 text-sm font-medium text-gray-800 dark:text-gray-200
                         focus:outline-none focus:ring-2 focus:ring-green-500 transition-all cursor-pointer"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id} className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200">
                  {proj.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-2"></div>
          <span className="text-sm">Fetching projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl mb-4">
            📂
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">No Projects Found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            You need at least one project in this workspace to use the AI features. Please create a project first!
          </p>
        </div>
      ) : !selectedProjectId ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <span className="text-sm">Please select a project to load AI tools.</span>
        </div>
      ) : (
        /* 2×2 feature grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PanelCard>
            <ProGate feature="Code Reviewer">
              <CodeReviewPanel />
            </ProGate>
          </PanelCard>

          <PanelCard>
            <ProGate feature="Project Summary">
              <ProjectSummaryPanel projectId={selectedProjectId} />
            </ProGate>
          </PanelCard>

          <PanelCard>
            <ProGate feature="Standup Generator">
              <StandupPanel projectId={selectedProjectId} />
            </ProGate>
          </PanelCard>

          <PanelCard>
            <ProGate feature="Task Breakdown">
              <TaskBreakdownPanel projectId={selectedProjectId} />
            </ProGate>
          </PanelCard>
        </div>
      )}
    </div>
  );
}
