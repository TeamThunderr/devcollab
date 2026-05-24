import { create } from 'zustand';
import api from '../lib/axios';

export interface ProjectFile {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  taskId?: string | null;
}

export interface EditorSettings {
  theme: 'vs-dark' | 'light';
  fontSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
  tabSize: number;
}

export interface TerminalOutput {
  id: string;
  type: 'command' | 'output' | 'error';
  content: string;
}

interface EditorState {
  files: ProjectFile[];
  activeFileId: string | null;
  openTabs: string[];
  isLoading: boolean;
  
  settings: EditorSettings;
  layout: {
    sidebarWidth: number;
    bottomPanelHeight: number;
    activityBarActive: 'explorer' | 'search' | 'source-control';
    bottomPanelActive: 'terminal' | 'output' | 'problems' | null;
  };
  terminalHistory: string[];
  terminalOutput: TerminalOutput[];
  
  fetchFileTree: (projectId: string) => Promise<void>;
  createFile: (projectId: string, data: Partial<ProjectFile>) => Promise<void>;
  updateFile: (projectId: string, fileId: string, data: Partial<ProjectFile>) => Promise<void>;
  deleteFile: (projectId: string, fileId: string) => Promise<void>;
  
  openTab: (projectId: string, fileId: string) => void;
  closeTab: (projectId: string, fileId: string) => void;
  setActiveFile: (projectId: string, fileId: string | null) => void;

  fetchEditorState: (projectId: string) => Promise<void>;
  syncEditorState: (projectId: string) => Promise<void>;

  updateSettings: (projectId: string, settings: Partial<EditorSettings>) => void;
  updateLayout: (projectId: string, layout: Partial<EditorState['layout']>) => void;
  
  addTerminalOutput: (output: TerminalOutput) => void;
  executeCommand: (projectId: string, command: string) => Promise<void>;
  executeCode: (projectId: string, language: string, content: string) => Promise<void>;
}

const defaultSettings: EditorSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  wordWrap: 'on',
  minimap: true,
  tabSize: 2,
};

const defaultLayout: EditorState['layout'] = {
  sidebarWidth: 250,
  bottomPanelHeight: 200,
  activityBarActive: 'explorer',
  bottomPanelActive: 'terminal',
};

const useEditorStore = create<EditorState>((set, get) => ({
  files: [],
  activeFileId: null,
  openTabs: [],
  isLoading: false,
  
  settings: defaultSettings,
  layout: defaultLayout,
  terminalHistory: [],
  terminalOutput: [],

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

  fetchEditorState: async (projectId) => {
    try {
      const response = await api.get(`/api/editor/projects/${projectId}/editor-state`);
      const data = response.data;
      set({
        settings: { ...defaultSettings, ...(data.settings || {}) },
        layout: { ...defaultLayout, ...(data.layout || {}) },
        openTabs: data.open_tabs || [],
        activeFileId: data.active_file_id || null,
        terminalHistory: data.terminal_history || [],
      });
    } catch (error) {
      console.error('Failed to fetch editor state:', error);
    }
  },

  syncEditorState: async (projectId) => {
    const { settings, layout, openTabs, activeFileId, terminalHistory } = get();
    try {
      await api.put(`/api/editor/projects/${projectId}/editor-state`, {
        settings,
        layout,
        openTabs,
        activeFileId,
        terminalHistory,
      });
    } catch (error) {
      console.error('Failed to sync editor state:', error);
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
      set((state) => {
        const newFiles = state.files.filter((f) => f.id !== fileId && f.parentId !== fileId);
        const newTabs = state.openTabs.filter((id) => id !== fileId);
        const newActiveFileId = state.activeFileId === fileId 
          ? (newTabs.length > 0 ? newTabs[newTabs.length - 1] : null) 
          : state.activeFileId;
        
        return {
          files: newFiles,
          openTabs: newTabs,
          activeFileId: newActiveFileId
        };
      });
      get().syncEditorState(projectId);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  },

  openTab: (projectId, fileId) => {
    const { openTabs, files, activeFileId } = get();
    const file = files.find(f => f.id === fileId);
    if (file) {
      if (!openTabs.includes(fileId)) {
        set({ openTabs: [...openTabs, fileId], activeFileId: fileId });
      } else if (activeFileId !== fileId) {
        set({ activeFileId: fileId });
      } else {
        return; 
      }
      if (projectId) get().syncEditorState(projectId);
    }
  },

  closeTab: (projectId, fileId) => {
    const { openTabs, activeFileId } = get();
    const newTabs = openTabs.filter((id) => id !== fileId);
    let newActiveFileId = activeFileId;
    
    if (activeFileId === fileId) {
      newActiveFileId = newTabs.length > 0 ? newTabs[newTabs.length - 1] : null;
    }
    
    set({ openTabs: newTabs, activeFileId: newActiveFileId });
    if (projectId) get().syncEditorState(projectId);
  },

  setActiveFile: (projectId, fileId) => {
    set({ activeFileId: fileId });
    if (projectId) get().syncEditorState(projectId);
  },

  updateSettings: (projectId, settings) => {
    set((state) => ({ settings: { ...state.settings, ...settings } }));
    if (projectId) get().syncEditorState(projectId);
  },

  updateLayout: (projectId, layout) => {
    set((state) => ({ layout: { ...state.layout, ...layout } }));
    if (projectId) get().syncEditorState(projectId);
  },

  addTerminalOutput: (output) => {
    set((state) => ({ terminalOutput: [...state.terminalOutput, output] }));
  },

  executeCommand: async (projectId, command) => {
    if (!command.trim()) return;
    
    set((state) => ({
      terminalHistory: [...state.terminalHistory.filter(c => c !== command), command],
      terminalOutput: [...state.terminalOutput, { id: Date.now().toString(), type: 'command', content: `$ ${command}` }]
    }));
    get().syncEditorState(projectId);

    try {
      const response = await api.post(`/api/editor/projects/${projectId}/terminal`, { command });
      if (response.data.stdout) {
        get().addTerminalOutput({ id: Date.now() + '-out', type: 'output', content: response.data.stdout });
      }
      if (response.data.stderr) {
        get().addTerminalOutput({ id: Date.now() + '-err', type: 'error', content: response.data.stderr });
      }
    } catch (err: any) {
      get().addTerminalOutput({ id: Date.now() + '-err', type: 'error', content: err.message || 'Command failed' });
    }
  },

  executeCode: async (projectId, language, content) => {
    get().updateLayout(projectId, { bottomPanelActive: 'output' });
    get().addTerminalOutput({ id: Date.now().toString(), type: 'command', content: `[Running ${language} code...]` });
    
    try {
      const response = await api.post(`/api/editor/projects/${projectId}/execute`, { language, content });
      if (response.data.stdout) {
        get().addTerminalOutput({ id: Date.now() + '-out', type: 'output', content: response.data.stdout });
      }
      if (response.data.stderr) {
        get().addTerminalOutput({ id: Date.now() + '-err', type: 'error', content: response.data.stderr });
      }
      get().addTerminalOutput({ id: Date.now() + '-done', type: 'command', content: `[Execution finished]` });
    } catch (err: any) {
      get().addTerminalOutput({ id: Date.now() + '-err', type: 'error', content: err.message || 'Execution failed' });
    }
  }
}));

export default useEditorStore;
