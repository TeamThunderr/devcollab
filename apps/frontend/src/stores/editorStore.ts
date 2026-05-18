import { create } from 'zustand';

interface EditorState {
  // TODO: openFiles, activeFile, fileTree, cursors
}

const useEditorStore = create<EditorState>()(() => ({
  // TODO: initial state
}));

export default useEditorStore;
