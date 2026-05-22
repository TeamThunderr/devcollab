// TEMP (real data integration pending) — AI features are functional in mock mode

import React from "react";
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
                 rounded-2xl p-5 shadow-sm"
    >
      {children}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function AIAssistantView(): React.ReactElement {
  // During development, AI_MOCK_MODE is always true on the backend.
  // Show the mock indicator in the UI so the team knows what's active.
  const isMockMode = true; // TODO: read from backend config endpoint

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            🤖 AI Assistant
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Powered by Gemini — your intelligent project companion
          </p>
        </div>

        {/* AI mode indicator */}
        {isMockMode && (
          <div
            title="Switch AI_MOCK_MODE=false in .env for real AI"
            className="flex items-center gap-1.5
                       bg-amber-100 dark:bg-amber-900/30
                       text-amber-700 dark:text-amber-400
                       text-xs font-medium
                       px-3 py-1 rounded-full
                       cursor-help select-none"
          >
            ⚡ Mock Mode
          </div>
        )}
      </div>

      {/* 2×2 feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PanelCard>
          <ProGate feature="Code Reviewer">
            <CodeReviewPanel />
          </ProGate>
        </PanelCard>

        <PanelCard>
          <ProGate feature="Project Summary">
            <ProjectSummaryPanel />
          </ProGate>
        </PanelCard>

        <PanelCard>
          <ProGate feature="Standup Generator">
            <StandupPanel />
          </ProGate>
        </PanelCard>

        <PanelCard>
          <ProGate feature="Task Breakdown">
            <TaskBreakdownPanel />
          </ProGate>
        </PanelCard>
      </div>
    </div>
  );
}
