import { create } from 'zustand';
import api from '../lib/axios';

export interface WikiPage {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  slug: string;
  content: string;
  linkedTaskId: string | null;
  linkedFileId: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WikiVersion {
  id: string;
  pageId: string;
  contentSnapshot: string;
  versionNumber: number;
  createdBy: string;
  createdAt: string;
}

interface WikiState {
  pages: WikiPage[];
  activePageId: string | null;
  activePage: WikiPage | null;
  versions: WikiVersion[];
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: 'saved' | 'saving' | 'error' | null;
  editorVersion: number;

  // Actions
  fetchPages: (projectId: string) => Promise<void>;
  fetchPage: (id: string) => Promise<void>;
  createPage: (projectId: string, title: string, workspaceId: string) => Promise<WikiPage>;
  updatePage: (id: string, data: { title?: string; content?: string }) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  setActivePageId: (id: string | null) => void;
  
  // Versions
  fetchVersions: (pageId: string) => Promise<void>;
  createVersion: (pageId: string) => Promise<void>;
  restoreVersion: (pageId: string, versionId: string) => Promise<void>;
}

const useWikiStore = create<WikiState>((set, get) => ({
  pages: [],
  activePageId: null,
  activePage: null,
  versions: [],
  isLoading: false,
  isSaving: false,
  saveStatus: null,
  editorVersion: 0,

  fetchPages: async (projectId) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/api/wiki/projects/${projectId}/pages`);
      set({ pages: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch wiki pages:', error);
      set({ isLoading: false });
    }
  },

  fetchPage: async (id) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/api/wiki/pages/${id}`);
      set({ activePage: response.data, isLoading: false, editorVersion: get().editorVersion + 1 });
    } catch (error) {
      console.error('Failed to fetch wiki page:', error);
      set({ isLoading: false });
    }
  },

  createPage: async (projectId, title, workspaceId) => {
    try {
      const response = await api.post(`/api/wiki/projects/${projectId}/pages`, { title, workspaceId });
      set((state) => ({ pages: [response.data, ...state.pages] }));
      return response.data;
    } catch (error) {
      console.error('Failed to create wiki page:', error);
      throw error;
    }
  },

  updatePage: async (id, data) => {
    set({ isSaving: true, saveStatus: 'saving' });
    try {
      const response = await api.put(`/api/wiki/pages/${id}`, data);
      set((state) => ({
        pages: state.pages.map((p) => (p.id === id ? { ...p, ...response.data } : p)),
        activePage: state.activePage?.id === id ? { ...state.activePage, ...response.data } : state.activePage,
        isSaving: false,
        saveStatus: 'saved',
      }));
      // Reset save status after 2 seconds
      setTimeout(() => {
        if (get().saveStatus === 'saved') set({ saveStatus: null });
      }, 2000);
    } catch (error) {
      console.error('Failed to update wiki page:', error);
      set({ isSaving: false, saveStatus: 'error' });
      throw error;
    }
  },

  deletePage: async (id) => {
    try {
      await api.delete(`/api/wiki/pages/${id}`);
      set((state) => ({
        pages: state.pages.filter((p) => p.id !== id),
        activePageId: state.activePageId === id ? null : state.activePageId,
        activePage: state.activePage?.id === id ? null : state.activePage,
      }));
    } catch (error) {
      console.error('Failed to delete wiki page:', error);
      throw error;
    }
  },

  setActivePageId: (id) => {
    set({ activePageId: id });
    if (id) {
      get().fetchPage(id);
    } else {
      set({ activePage: null, versions: [] });
    }
  },

  fetchVersions: async (pageId) => {
    try {
      const response = await api.get(`/api/wiki/pages/${pageId}/versions`);
      set({ versions: response.data });
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    }
  },

  createVersion: async (pageId) => {
    try {
      await api.post(`/api/wiki/pages/${pageId}/versions`);
      get().fetchVersions(pageId);
    } catch (error) {
      console.error('Failed to create version:', error);
      throw error;
    }
  },

  restoreVersion: async (pageId, versionId) => {
    try {
      const response = await api.post(`/api/wiki/pages/${pageId}/restore/${versionId}`);
      set((state) => ({
        pages: state.pages.map((p) => (p.id === pageId ? { ...p, ...response.data } : p)),
        activePage: { ...state.activePage!, ...response.data },
        editorVersion: state.editorVersion + 1,
      }));
    } catch (error) {
      console.error('Failed to restore version:', error);
      throw error;
    }
  },
}));

export default useWikiStore;
