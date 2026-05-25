import { create } from 'zustand';
import { Workspace, WorkspaceMember, WorkspaceRole } from '../types';
import { workspaceService } from '../services/api/workspace.service';

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  members: WorkspaceMember[];
  isLoading: boolean;
  hasFetchedWorkspaces: boolean;
  error: string | null;

  fetchWorkspaces: () => Promise<void>;
  fetchWorkspaceDetails: (id: string) => Promise<void>;
  createWorkspace: (data: { name: string; slug: string }) => Promise<Workspace>;
  inviteMember: (workspaceId: string, email: string, role: WorkspaceRole) => Promise<void>;
  updateMemberRole: (workspaceId: string, memberId: string, role: WorkspaceRole) => Promise<void>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  
  clearError: () => void;
}

const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspaces: [],
  activeWorkspace: null,
  members: [],
  isLoading: false,
  hasFetchedWorkspaces: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await workspaceService.getWorkspaces();
      set({ workspaces, isLoading: false, hasFetchedWorkspaces: true });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to fetch workspaces', 
        isLoading: false,
        hasFetchedWorkspaces: true
      });
      throw error;
    }
  },

  fetchWorkspaceDetails: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // We could fire these in parallel
      const [workspace, members] = await Promise.all([
        workspaceService.getWorkspace(id),
        workspaceService.getMembers(id)
      ]);
      set({ activeWorkspace: workspace, members, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to fetch workspace details', 
        isLoading: false,
        activeWorkspace: null,
        members: []
      });
      throw error;
    }
  },

  createWorkspace: async (data: { name: string; slug: string }) => {
    set({ isLoading: true, error: null });
    try {
      const newWorkspace = await workspaceService.createWorkspace(data);
      // Add the newly created workspace to the top of the list
      set((state) => ({ 
        workspaces: [newWorkspace, ...state.workspaces],
        isLoading: false 
      }));
      return newWorkspace;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to create workspace', 
        isLoading: false 
      });
      throw error;
    }
  },

  inviteMember: async (workspaceId: string, email: string, role: WorkspaceRole) => {
    set({ isLoading: true, error: null });
    try {
      await workspaceService.inviteMember(workspaceId, email, role);
      // Re-fetch members to get the updated list
      const members = await workspaceService.getMembers(workspaceId);
      set({ members, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to invite member', 
        isLoading: false 
      });
      throw error;
    }
  },

  updateMemberRole: async (workspaceId: string, memberId: string, role: WorkspaceRole) => {
    set({ isLoading: true, error: null });
    try {
      const updatedMember = await workspaceService.updateRole(workspaceId, memberId, role);
      set((state) => ({
        members: state.members.map((m) => m.userId === memberId ? { ...m, ...updatedMember } : m),
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to update member role', 
        isLoading: false 
      });
      throw error;
    }
  },

  removeMember: async (workspaceId: string, memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      await workspaceService.removeMember(workspaceId, memberId);
      set((state) => ({
        members: state.members.filter((m) => m.userId !== memberId),
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to remove member', 
        isLoading: false 
      });
      throw error;
    }
  }
}));

export default useWorkspaceStore;
