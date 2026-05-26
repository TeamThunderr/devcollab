import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useWorkspaceStore from '../../stores/workspaceStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import CreateWorkspaceModal from '../../components/workspace/CreateWorkspaceModal';

export default function WorkspaceList(): React.ReactElement {
  const { workspaces, isLoading, hasFetchedWorkspaces, fetchWorkspaces } = useWorkspaceStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Intercept completely new users
  useEffect(() => {
    if (!isLoading && hasFetchedWorkspaces && workspaces.length === 0) {
      navigate('/onboarding/welcome', { replace: true });
    }
  }, [isLoading, hasFetchedWorkspaces, workspaces.length, navigate]);

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Workspaces</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select a workspace to enter or create a new one.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Workspace
        </button>
      </div>

      {isLoading && workspaces.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              to={`/w/${workspace.id}`}
              className="group block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm">
                  {workspace.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                  Active
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {workspace.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                app.devcollab.com/{workspace.slug}
              </p>
              
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Team Workspace
                </span>
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Enter <span aria-hidden="true">&rarr;</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateWorkspaceModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
