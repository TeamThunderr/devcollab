import { create } from 'zustand';
import api from '../lib/axios';
import { Project } from '../types';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  user: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    bio?: string;
  };
}

interface CreateProjectPayload {
  name: string;
  description?: string;
  workspaceId: string;
}

interface ProjectStore {
  projects: Project[];
  loading: boolean;
  error?: string;
  fetchProjects: (workspaceId: string) => Promise<void>;
  createProject: (payload: CreateProjectPayload) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  // Members
  projectMembers: Record<string, ProjectMember[]>; // keyed by projectId
  fetchProjectMembers: (projectId: string) => Promise<void>;
  assignProjectMember: (projectId: string, userId: string) => Promise<void>;
  removeProjectMember: (projectId: string, userId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  loading: false,
  error: undefined,
  projectMembers: {},

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
    try {
      const response = await api.get<ProjectMember[]>(`/api/projects/${projectId}/members`);
      set((state) => ({
        projectMembers: {
          ...state.projectMembers,
          [projectId]: response.data,
        },
      }));
    } catch (error: any) {
      console.error('Failed to fetch project members', error);
    }
  },

  assignProjectMember: async (projectId, userId) => {
    try {
      const response = await api.post<ProjectMember>(`/api/projects/${projectId}/members`, { userId });
      set((state) => ({
        projectMembers: {
          ...state.projectMembers,
          [projectId]: [...(state.projectMembers[projectId] || []), response.data],
        },
      }));
    } catch (error: any) {
      console.error('Failed to assign project member', error);
      throw error;
    }
  },

  removeProjectMember: async (projectId, userId) => {
    try {
      await api.delete(`/api/projects/${projectId}/members/${userId}`);
      set((state) => ({
        projectMembers: {
          ...state.projectMembers,
          [projectId]: (state.projectMembers[projectId] || []).filter(m => m.userId !== userId),
        },
      }));
    } catch (error: any) {
      console.error('Failed to remove project member', error);
      throw error;
    }
  },
}));
