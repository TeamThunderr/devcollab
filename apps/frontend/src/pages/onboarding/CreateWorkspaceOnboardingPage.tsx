import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useWorkspaceStore from '../../stores/workspaceStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function CreateWorkspaceOnboardingPage(): React.ReactElement {
  const navigate = useNavigate();
  const { createWorkspace, error, clearError } = useWorkspaceStore();
  
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const workspace = await createWorkspace({ name, slug });
      if (workspace) {
        navigate(`/w/${workspace.id}`, { replace: true });
      }
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to DevCollab</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Let's get started by creating your first workspace
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="workspaceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Workspace Name
              </label>
              <input
                id="workspaceName"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) clearError();
                }}
                placeholder="e.g. Acme Corp"
                disabled={isSubmitting}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow disabled:opacity-50"
                autoFocus
                required
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                This will be the shared space for your team's projects.
              </p>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800/50">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : null}
              Create Workspace
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
