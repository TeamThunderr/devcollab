import React from 'react';
import { Link, useParams } from 'react-router-dom';

export default function WorkspaceDashboard(): React.ReactElement {
  const { workspaceSlug = 'default-workspace' } = useParams<{ workspaceSlug: string }>();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="mt-2 text-slate-500">Welcome to your workspace overview.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Module 2: Projects & Tasks Card */}
        <Link 
          to={`/${workspaceSlug}/projects`}
          className="group block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-xl mb-4 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              P
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Module 2</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Projects & Tasks</h2>
          <p className="mt-2 text-sm text-slate-500 line-clamp-2">
            Organize work streams, manage Kanban boards, and track progress across your workspace.
          </p>
          <div className="mt-6 flex items-center text-sm font-semibold text-cyan-600 group-hover:text-cyan-700">
            View Projects &rarr;
          </div>
        </Link>

        {/* Module 5: Code Snippets Card - Placeholder for navigation since Snippets need a Project ID */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm opacity-80">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl mb-4">
              {'{ }'}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Module 5</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Code Snippets</h2>
          <p className="mt-2 text-sm text-slate-500 line-clamp-2">
            Reusable code components and scripts. Select a project first to view its snippets.
          </p>
          <div className="mt-6">
            <Link 
              to={`/${workspaceSlug}/projects`}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Go to Projects first &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
