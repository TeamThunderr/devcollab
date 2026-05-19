import { create } from 'zustand';
import api from '../lib/axios';
import { Task, Comment, TaskStatus, TaskPriority } from '../types';

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error?: string;

  fetchTasksByProject: (projectId: string) => Promise<void>;
  createTask: (data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string | null;
    projectId: string;
  }) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'comments' | 'projectId'>>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<Comment>;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  loading: false,
  error: undefined,

  fetchTasksByProject: async (projectId) => {
    set({ loading: true, error: undefined });
    try {
      const response = await api.get(`/tasks/project/${projectId}`);
      set({ tasks: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createTask: async (data) => {
    try {
      const response = await api.post('/tasks', data);
      set((state) => ({
        tasks: [response.data, ...state.tasks],
      }));
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateTask: async (id, updates) => {
    try {
      const response = await api.patch(`/tasks/${id}`, updates);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...response.data } : t)),
      }));
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteTask: async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  addComment: async (taskId, content) => {
    try {
      const response = await api.post(`/tasks/${taskId}/comments`, { content });
      set((state) => ({
        tasks: state.tasks.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              comments: [response.data, ...(t.comments || [])],
            };
          }
          return t;
        }),
      }));
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}));
