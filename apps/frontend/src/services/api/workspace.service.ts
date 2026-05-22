import { apiClient } from './client';
import { Workspace, WorkspaceMember, WorkspaceRole } from '../../types';

export const workspaceService = {
  // Get all workspaces the current user belongs to
  async getWorkspaces(): Promise<Workspace[]> {
    const response = await apiClient.get<Workspace[]>('/workspaces');
    return response.data;
  },

  // Get a specific workspace by ID
  async getWorkspace(id: string): Promise<Workspace> {
    const response = await apiClient.get<Workspace>(`/workspaces/${id}`);
    return response.data;
  },

  // Create a new workspace
  async createWorkspace(data: { name: string; slug: string }): Promise<Workspace> {
    const response = await apiClient.post<Workspace>('/workspaces', data);
    return response.data;
  },

  // Get all members of a workspace
  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const response = await apiClient.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
    return response.data;
  },

  // Invite a new member to the workspace
  async inviteMember(workspaceId: string, email: string, role: WorkspaceRole): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/workspaces/${workspaceId}/invites`, { email, role });
    return response.data;
  },

  // Update a member's role
  async updateRole(workspaceId: string, memberId: string, role: WorkspaceRole): Promise<WorkspaceMember> {
    const response = await apiClient.patch<WorkspaceMember>(`/workspaces/${workspaceId}/members/${memberId}`, { role });
    return response.data;
  },

  // Remove a member from the workspace
  async removeMember(workspaceId: string, memberId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/workspaces/${workspaceId}/members/${memberId}`);
    return response.data;
  }
};
