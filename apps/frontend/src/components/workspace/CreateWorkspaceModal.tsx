import React, { useState, useEffect } from 'react';
import useWorkspaceStore from '../../stores/workspaceStore';
import LoadingSpinner from '../ui/LoadingSpinner';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const { createWorkspace, isLoading, error, clearError } = useWorkspaceStore();

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSlug('');
      setIsSlugManuallyEdited(false);
      clearError();
    }
  }, [isOpen, clearError]);

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!isSlugManuallyEdited) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  }, [name, isSlugManuallyEdited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    try {
      await createWorkspace({ name, slug });
      onClose();
    } catch (err) {
      // Error is already handled by the store and will be displayed below
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Workspace</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Workspace Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Corp"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                required
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Workspace URL Slug
              </label>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                <span className="inline-flex items-center px-3 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm border-r border-gray-300 dark:border-gray-700 select-none">
                  app.devcollab.com/
                </span>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setIsSlugManuallyEdited(true);
                  }}
                  placeholder="acme-corp"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800/50">
                {error.includes('FREE plan') ? (
                  <div className="flex flex-col gap-2">
                    <span className="font-semibold">Plan Limit Reached</span>
                    <span>You can only create 1 workspace on the FREE plan. Upgrade your plan to create more.</span>
                  </div>
                ) : (
                  error
                )}
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !name.trim() || !slug.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : null}
                Create Workspace
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
