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
  visibility?: 'public' | 'private';
}

interface ProjectStore {
  projects: Project[];
  loading: boolean;
  membersLoading: boolean;
  error?: string;
  fetchProjects: (workspaceId: string) => Promise<void>;
  createProject: (payload: CreateProjectPayload) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  // Members
  projectMembers: Record<string, ProjectMember[]>; // keyed by projectId
  fetchProjectMembers: (projectId: string) => Promise<void>;
  assignProjectMember: (projectId: string, userId: string, role?: string) => Promise<void>;
  removeProjectMember: (projectId: string, userId: string) => Promise<void>;
  addProjectMemberState: (projectId: string, member: ProjectMember) => void;
  removeProjectMemberState: (projectId: string, userId: string) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  loading: false,
  membersLoading: false,
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
    set({ membersLoading: true, error: undefined });
    try {
      const response = await api.get<ProjectMember[]>(`/api/projects/${projectId}/members`);
      set((state) => ({
        projectMembers: {
          ...state.projectMembers,
          [projectId]: response.data,
        },
        membersLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, membersLoading: false });
      console.error('Failed to fetch project members', error);
    }
  },

  assignProjectMember: async (projectId, userId, role) => {
    try {
      const response = await api.post<ProjectMember>(`/api/projects/${projectId}/members`, { userId, role });
      set((state) => ({
        projectMembers: {
          ...state.projectMembers,
          [projectId]: [...(state.projectMembers[projectId] || []), response.data],
        },
      }));
    } catch (error) {
      // HTTP interceptor handles toast
      throw error;
    }
  },

  removeProjectMember: async (projectId, userId) => {
    try {
      await api.delete(`/api/projects/${projectId}/members/${userId}`);
      set((state) => ({
        projectMembers: {
          ...state.projectMembers,
          [projectId]: (state.projectMembers[projectId] || []).filter((m) => m.userId !== userId),
        },
      }));
    } catch (error) {
      // HTTP interceptor handles toast
      throw error;
    }
  },

  addProjectMemberState: (projectId, member) =>
    set((state) => {
      const current = state.projectMembers[projectId] || [];
      if (current.some((m) => m.userId === member.userId)) {
        return {
          projectMembers: {
            ...state.projectMembers,
            [projectId]: current.map((m) => (m.userId === member.userId ? member : m)),
          },
        };
      }
      return {
        projectMembers: {
          ...state.projectMembers,
          [projectId]: [...current, member],
        },
      };
    }),

  removeProjectMemberState: (projectId, userId) =>
    set((state) => ({
      projectMembers: {
        ...state.projectMembers,
        [projectId]: (state.projectMembers[projectId] || []).filter((m) => m.userId !== userId),
      },
    })),

}));
