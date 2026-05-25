import { create } from 'zustand';
import api from '../lib/axios';
import { Task, Comment, TaskStatus, TaskPriority } from '../types';

export type { Task, Comment, TaskStatus, TaskPriority };

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error?: string;

  // REST API Actions
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

  // Local/Real-time State Actions (WebSockets)
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  addTaskState: (task: Task) => void;
  updateTaskState: (task: Task) => void;
  moveTaskState: (taskId: string, newStatus: string, newPosition?: number) => void;
  deleteTaskState: (taskId: string) => void;
  addCommentState: (taskId: string, comment: Comment) => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: undefined,

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) =>
    set((state) => {
      if (state.tasks.some((t) => t.id === task.id)) return state;
      return { tasks: [task, ...state.tasks] };
    }),

  fetchTasksByProject: async (projectId) => {
    set({ loading: true, error: undefined });
    try {
      const response = await api.get(`/api/tasks/project/${projectId}`);
      set({ tasks: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createTask: async (data) => {
    const tempId = `temp-${Date.now()}`;
    const tempTask: Task = {
      id: tempId,
      title: data.title,
      description: data.description ?? undefined,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ?? undefined,
      projectId: data.projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: {
        id: 'temp-user',
        email: 'you@devcollab.com',
        name: 'You'
      },
      comments: []
    };

    // Prepend optimistic placeholder immediately
    set((state) => ({
      tasks: [tempTask, ...state.tasks],
    }));

    try {
      const response = await api.post('/api/tasks', data);
      // Replace the temp task with the actual added task
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === tempId ? response.data : t)),
      }));
      return response.data;
    } catch (error: any) {
      // Revert the temp task on error
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== tempId),
      }));
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  updateTask: async (id, updates) => {
    const originalTasks = get().tasks;

    // Apply updates optimistically in state immediately
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));

    try {
      const response = await api.patch(`/api/tasks/${id}`, updates);
      // Re-align task with actual response database payload
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...response.data } : t)),
      }));
      return response.data;
    } catch (error: any) {
      // Rollback to original state on failure
      set({ tasks: originalTasks });
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  deleteTask: async (id) => {
    try {
      await api.delete(`/api/tasks/${id}`);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message);
    }
  },

  addComment: async (taskId, content) => {
    try {
      const response = await api.post(`/api/tasks/${taskId}/comments`, { content });
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
  },

  // Real-time State Actions
  addTaskState: (task) =>
    set((state) => {
      if (state.tasks.some((t) => t.id === task.id)) return state;
      return { tasks: [task, ...state.tasks] };
    }),

  updateTaskState: (task) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t)),
    })),

  moveTaskState: (taskId, newStatus, _newPosition) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus as TaskStatus } : t
      ),
    })),

  deleteTaskState: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    })),

  addCommentState: (taskId, comment) =>
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id === taskId) {
          const comments = t.comments || [];
          if (comments.some((c) => c.id === comment.id)) return t;
          return {
            ...t,
            comments: [comment, ...comments],
          };
        }
        return t;
      }),
    })),
}));

export default useTaskStore;
