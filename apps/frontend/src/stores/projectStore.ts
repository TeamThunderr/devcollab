import { create } from 'zustand';
import api from '../lib/axios';
import { Project } from '../types';

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
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  loading: false,
  error: undefined,

  fetchProjects: async (workspaceId) => {
    set({ loading: true, error: undefined });

    try {
      const response = await api.get<Project[]>('/projects', {
        params: { workspaceId },
      });
      set({ projects: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createProject: async (payload) => {
    const response = await api.post<Project>('/projects', payload);
    set((state) => ({
      projects: [response.data, ...state.projects],
    }));
    return response.data;
  },

  deleteProject: async (id) => {
    await api.delete(`/projects/${id}`);
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    }));
  },
}));
