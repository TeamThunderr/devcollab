import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useWorkspaceStore from '../../stores/workspaceStore';
import CreateWorkspaceModal from './CreateWorkspaceModal';

export default function WorkspaceSwitcher(): React.ReactElement {
  const { workspaces, activeWorkspace, fetchWorkspaceDetails } = useWorkspaceStore();
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Sync active workspace when URL changes
  useEffect(() => {
    if (workspaceId && (!activeWorkspace || activeWorkspace.id !== workspaceId)) {
      fetchWorkspaceDetails(workspaceId).catch(() => {
        // If it fails (e.g., 404 or unauthorized), redirect to root
        navigate('/');
      });
    }
  }, [workspaceId, activeWorkspace, fetchWorkspaceDetails, navigate]);

  const handleSwitch = (id: string) => {
    setIsOpen(false);
    navigate(`/${id}`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {activeWorkspace ? activeWorkspace.name.substring(0, 1).toUpperCase() : 'W'}
          </div>
          <span className="text-sm font-medium text-white truncate">
            {activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-gray-900 border border-gray-800 rounded-lg shadow-xl overflow-hidden py-1">
            <div className="max-h-60 overflow-y-auto">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleSwitch(workspace.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-800 transition-colors ${
                    activeWorkspace?.id === workspace.id ? 'text-blue-400' : 'text-gray-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-[10px] font-bold text-white">
                    {workspace.name.substring(0, 1).toUpperCase()}
                  </div>
                  <span className="truncate">{workspace.name}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-800 mt-1 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                View all workspaces
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsCreateModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create workspace
              </button>
            </div>
          </div>
        </>
      )}

      <CreateWorkspaceModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
}
