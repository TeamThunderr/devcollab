import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useWorkspaceStore from '../../stores/workspaceStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { usePresence } from '../../hooks/usePresence';
import useAuthStore from '../../stores/authStore';

export default function WorkspaceDashboardPage(): React.ReactElement {
  const { workspaceId } = useParams();
  const { activeWorkspace, members, isLoading, fetchWorkspaceDetails } = useWorkspaceStore();
  const currentUser = useAuthStore(s => s.user);
  
  const { onlineUsers } = usePresence(workspaceId || '');
  const othersOnline = onlineUsers.filter(u => u.userId !== currentUser?.id);

  useEffect(() => {
    if (workspaceId) {
      if (!activeWorkspace || activeWorkspace.id !== workspaceId) {
        fetchWorkspaceDetails(workspaceId).catch(console.error);
      }
    }
  }, [workspaceId, activeWorkspace, fetchWorkspaceDetails]);

  if (isLoading && !activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="p-8 text-center text-gray-500">
        Workspace not found.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to {activeWorkspace.name}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Here's an overview of what's happening in your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{members.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Projects</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">1</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Activity</p>
                <Link to={`/${workspaceId}/activity`} className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors">
                  View &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Collaboration Area */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Jump back in</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to={`/${workspaceId}/projects/project-test-456`} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-500 hover:shadow-md transition-all group">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">Project Alpha</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Updated 2 hours ago</p>
                </Link>
                <Link to={`/${workspaceId}/wiki/project-test-456`} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-500 hover:shadow-md transition-all group">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">Team Wiki</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Read the latest documentation</p>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              Online Now
            </p>
            
            {othersOnline.length === 0 ? (
              <p className="text-xs text-gray-600">No one else is online</p>
            ) : (
              <div className="space-y-2">
                {othersOnline.map(u => (
                  <div key={u.userId} className="flex items-center gap-3 py-1.5">
                    <div className="relative flex-shrink-0">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-800" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white ring-1 ring-gray-200 dark:ring-gray-800">
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full ring-2 ring-white dark:ring-gray-900 animate-pulse"></span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white leading-none">{u.name}</span>
                      <span className="text-[11px] text-gray-500 mt-1 leading-none">
                        {u.projectId ? "In project" : "In workspace"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
