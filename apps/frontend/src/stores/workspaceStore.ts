import { create } from 'zustand';

interface WorkspaceState {
  // TODO: currentWorkspace, workspaces list
}

const useWorkspaceStore = create<WorkspaceState>()(() => ({
  // TODO: initial state
}));

export default useWorkspaceStore;
