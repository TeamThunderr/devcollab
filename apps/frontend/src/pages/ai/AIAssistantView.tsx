// TEMP — replace with real implementation (Module 7 — Claude AI integration)

import React, { useState } from "react";

// ─── Shared sub-components ────────────────────────────────────────────────────

function AICard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="bg-white dark:bg-gray-900
                    border border-gray-200 dark:border-gray-800
                    rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ResultArea(): React.ReactElement {
  return (
    <div className="min-h-[80px] rounded-lg
                    border-2 border-dashed border-gray-200 dark:border-gray-700
                    flex items-center justify-center">
      <p className="text-xs text-gray-400 dark:text-gray-600">
        Results will appear here
      </p>
    </div>
  );
}

function DisabledButton({ label }: { label: string }): React.ReactElement {
  return (
    <button
      type="button"
      disabled
      title="Coming soon..."
      className="px-4 py-2 text-sm font-medium rounded-lg
                 bg-gray-100 dark:bg-gray-800
                 text-gray-400 dark:text-gray-500
                 cursor-not-allowed border border-dashed
                 border-gray-300 dark:border-gray-700"
    >
      {label} — Coming soon…
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIAssistantView(): React.ReactElement {
  const [reviewCode, setReviewCode] = useState("");
  const [reviewLang, setReviewLang] = useState("JavaScript");
  const [taskDesc, setTaskDesc] = useState("");

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          AI Assistant
        </h2>

        {/* Coming soon banner */}
        <div className="mt-3 flex items-start gap-2
                        bg-amber-50 dark:bg-amber-950/30
                        border border-amber-200 dark:border-amber-800
                        rounded-lg px-4 py-3 text-xs
                        text-amber-700 dark:text-amber-300">
          <span aria-hidden="true">⚡</span>
          <p>
            AI features will be enabled in the next build. Connect your Claude
            API key in <code className="font-mono">.env</code> to activate.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Card 1 — Code Reviewer */}
        <AICard title="Code Reviewer">
          <textarea
            value={reviewCode}
            onChange={(e) => setReviewCode(e.target.value)}
            rows={5}
            placeholder="Paste your code here..."
            className="w-full px-3 py-2 text-xs font-mono rounded-lg resize-none
                       bg-gray-50 dark:bg-gray-800
                       border border-gray-200 dark:border-gray-700
                       text-gray-800 dark:text-gray-200
                       placeholder-gray-400 dark:placeholder-gray-600
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={reviewLang}
            onChange={(e) => setReviewLang(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg
                       bg-gray-50 dark:bg-gray-800
                       border border-gray-200 dark:border-gray-700
                       text-gray-700 dark:text-gray-300
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Programming language"
          >
            {["JavaScript", "Python", "Java", "C++", "Go"].map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>

          <DisabledButton label="Review with AI" />
          <ResultArea />
        </AICard>

        {/* Card 2 — Project Summariser */}
        <AICard title="Project Summariser">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Generates an AI summary of all tasks, activity, and progress in
            this project.
          </p>
          <DisabledButton label="Summarise Project" />
          <ResultArea />
        </AICard>

        {/* Card 3 — Task Breakdown */}
        <AICard title="Task Breakdown">
          <textarea
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
            rows={5}
            placeholder="Describe a feature..."
            className="w-full px-3 py-2 text-sm rounded-lg resize-none
                       bg-gray-50 dark:bg-gray-800
                       border border-gray-200 dark:border-gray-700
                       text-gray-800 dark:text-gray-200
                       placeholder-gray-400 dark:placeholder-gray-600
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <DisabledButton label="Break Down" />
          <ResultArea />
        </AICard>
      </div>
    </div>
  );
}
