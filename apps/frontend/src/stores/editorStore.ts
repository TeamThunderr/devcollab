import { create } from 'zustand';
import api from '../lib/axios';

export interface ProjectFile {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  taskId?: string | null;
}

interface EditorState {
  files: ProjectFile[];
  activeFileId: string | null;
  openTabs: string[];
  isLoading: boolean;
  
  // Actions
  fetchFileTree: (projectId: string) => Promise<void>;
  createFile: (projectId: string, data: Partial<ProjectFile>) => Promise<void>;
  updateFile: (projectId: string, fileId: string, data: Partial<ProjectFile>) => Promise<void>;
  deleteFile: (projectId: string, fileId: string) => Promise<void>;
  
  openTab: (fileId: string) => void;
  closeTab: (fileId: string) => void;
  setActiveFile: (fileId: string | null) => void;
}

const useEditorStore = create<EditorState>((set, get) => ({
  files: [],
  activeFileId: null,
  openTabs: [],
  isLoading: false,

  fetchFileTree: async (projectId) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/api/editor/projects/${projectId}/files`);
      set({ files: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch file tree:', error);
      set({ isLoading: false });
    }
  },

  createFile: async (projectId, data) => {
    try {
      const response = await api.post(`/api/editor/projects/${projectId}/files`, data);
      set((state) => ({ files: [...state.files, response.data] }));
    } catch (error) {
      console.error('Failed to create file:', error);
      throw error;
    }
  },

  updateFile: async (projectId, fileId, data) => {
    try {
      const response = await api.put(`/api/editor/projects/${projectId}/files/${fileId}`, data);
      set((state) => ({
        files: state.files.map((f) => (f.id === fileId ? { ...f, ...response.data } : f))
      }));
    } catch (error) {
      console.error('Failed to update file:', error);
      throw error;
    }
  },

  deleteFile: async (projectId, fileId) => {
    try {
      await api.delete(`/api/editor/projects/${projectId}/files/${fileId}`);
      set((state) => ({
        files: state.files.filter((f) => f.id !== fileId && f.parentId !== fileId),
        openTabs: state.openTabs.filter((id) => id !== fileId),
        activeFileId: state.activeFileId === fileId ? null : state.activeFileId
      }));
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  },

  openTab: (fileId) => {
    const { openTabs, files } = get();
    const file = files.find(f => f.id === fileId);
    if (file && file.type === 'file') {
      if (!openTabs.includes(fileId)) {
        set({ openTabs: [...openTabs, fileId], activeFileId: fileId });
      } else {
        set({ activeFileId: fileId });
      }
    }
  },

  closeTab: (fileId) => {
    const { openTabs, activeFileId } = get();
    const newTabs = openTabs.filter((id) => id !== fileId);
    let newActiveFileId = activeFileId;
    
    if (activeFileId === fileId) {
      newActiveFileId = newTabs.length > 0 ? newTabs[newTabs.length - 1] : null;
    }
    
    set({ openTabs: newTabs, activeFileId: newActiveFileId });
  },

  setActiveFile: (fileId) => {
    set({ activeFileId: fileId });
  }
}));

export default useEditorStore;
