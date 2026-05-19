import React from 'react';
import { Outlet, NavLink, useParams } from 'react-router-dom';

export default function AppLayout(): React.ReactElement {
  const { workspaceSlug = 'default-workspace' } = useParams<{ workspaceSlug: string }>();

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 text-slate-300 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold text-white tracking-tight">DevCollab</span>
        </div>

        <div className="px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Workspace</p>
          <div className="flex items-center gap-2 text-sm text-white font-medium bg-slate-800/50 px-3 py-2 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            {workspaceSlug}
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <NavLink
            to={`/${workspaceSlug}`}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-cyan-500/10 text-cyan-400' : 'hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to={`/${workspaceSlug}/projects`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-cyan-500/10 text-cyan-400' : 'hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            Projects
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
              U
            </div>
            <div className="text-sm">
              <p className="text-white font-medium">Test User</p>
              <p className="text-xs text-slate-500">user@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200 flex items-center px-8 shadow-sm z-10">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest">
            {workspaceSlug}
          </h2>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-slate-100">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
