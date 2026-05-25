import { create } from 'zustand';
import api from '../lib/axios';
import { Project, ProjectMember, WorkspaceRole } from '../types';

interface CreateProjectPayload {
  name: string;
  description?: string;
  workspaceId: string;
}

interface ProjectStore {
  projects: Project[];
  projectMembers: ProjectMember[];
  loading: boolean;
  error?: string;
  fetchProjects: (workspaceId: string) => Promise<void>;
  createProject: (payload: CreateProjectPayload) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  fetchProjectMembers: (projectId: string) => Promise<void>;
  assignProjectMember: (projectId: string, userId: string, role: WorkspaceRole) => Promise<void>;
  removeProjectMember: (projectId: string, userId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  projectMembers: [],
  loading: false,
  error: undefined,

  fetchProjects: async (workspaceId) => {
    set({ loading: true, error: undefined });

    try {
      const response = await api.get<Project[]>('/api/projects', {
        params: { workspaceId },
      });
      set({ projects: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createProject: async (payload) => {
    const response = await api.post<Project>('/api/projects', payload);
    set((state) => ({
      projects: [response.data, ...state.projects],
    }));
    return response.data;
  },

  deleteProject: async (id) => {
    await api.delete(`/api/projects/${id}`);
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    }));
  },

  fetchProjectMembers: async (projectId) => {
    set({ loading: true, error: undefined });
    try {
      const response = await api.get<ProjectMember[]>(`/api/projects/${projectId}/members`);
      set({ projectMembers: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  assignProjectMember: async (projectId, userId, role) => {
    try {
      await api.post(`/api/projects/${projectId}/members`, { userId, role });
      const response = await api.get<ProjectMember[]>(`/api/projects/${projectId}/members`);
      set({ projectMembers: response.data });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  removeProjectMember: async (projectId, userId) => {
    try {
      await api.delete(`/api/projects/${projectId}/members/${userId}`);
      set((state) => ({
        projectMembers: state.projectMembers.filter((m) => m.userId !== userId),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));
