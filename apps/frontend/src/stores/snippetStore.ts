import { create } from 'zustand';
import api from '../lib/axios';
import { toast } from './toastStore';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  description?: string;
  tags: string[];
  projectId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
}

interface SnippetStore {
  snippets: Snippet[];
  loading: boolean;
  error?: string;

  fetchSnippetsByProject: (projectId: string) => Promise<void>;
  createSnippet: (
    title: string,
    language: string,
    code: string,
    description: string | undefined,
    tags: string[],
    projectId: string,
  ) => Promise<Snippet>;
  updateSnippet: (
    id: string,
    updates: Partial<Omit<Snippet, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>,
  ) => Promise<Snippet>;
  deleteSnippet: (id: string) => Promise<void>;
  searchSnippets: (projectId: string, query: string) => Promise<void>;
  filterSnippets: (predicate: (s: Snippet) => boolean) => Snippet[];
}

export const useSnippetStore = create<SnippetStore>((set, get) => ({
  snippets: [],
  loading: false,
  error: undefined,

  fetchSnippetsByProject: async (projectId) => {
    set({ loading: true, error: undefined });
    try {
      const response = await api.get(`/api/snippets/project/${projectId}`);
      set({ snippets: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createSnippet: async (title, language, code, description, tags, projectId) => {
    try {
      const response = await api.post('/api/snippets', {
        title,
        language,
        code,
        description,
        tags,
        projectId,
      });
      set((state) => ({
        snippets: [response.data, ...state.snippets],
      }));
      toast.success('Snippet saved', `"${title}" added to your snippets`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  updateSnippet: async (id, updates) => {
    try {
      const response = await api.patch(`/api/snippets/${id}`, updates);
      set((state) => ({
        snippets: state.snippets.map((s) => (s.id === id ? response.data : s)),
      }));
      return response.data;
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  deleteSnippet: async (id) => {
    try {
      await api.delete(`/api/snippets/${id}`);
      set((state) => ({
        snippets: state.snippets.filter((s) => s.id !== id),
      }));
      toast.success('Snippet deleted');
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  searchSnippets: async (projectId, query) => {
    set({ loading: true, error: undefined });
    try {
      const response = await api.get(`/api/snippets/project/${projectId}/search`, {
        params: { q: query },
      });
      set({ snippets: response.data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  filterSnippets: (predicate) => {
    return get().snippets.filter(predicate);
  },
}));
