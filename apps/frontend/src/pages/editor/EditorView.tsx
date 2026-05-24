import { useState, useEffect, useCallback } from "react";
import ActivityBar from "../../components/editor/ActivityBar";
import Sidebar from "../../components/editor/Sidebar";
import EditorTabs from "../../components/editor/EditorTabs";
import MonacoEditor from "../../components/editor/MonacoEditor";
import BottomPanel from "../../components/editor/BottomPanel";
import CommandPalette from "../../components/editor/CommandPalette";
import TopMenuBar from "../../components/editor/TopMenuBar";
import useEditorStore from "../../stores/editorStore";
import { useParams } from "react-router-dom";

export default function EditorView() {
  const { projectId } = useParams();
  
  if (!projectId) return null;
  const { files, activeFileId, updateFile, fetchEditorState, settings } = useEditorStore();
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    fetchEditorState(projectId);
  }, [projectId, fetchEditorState]);

  const activeFile = files.find(f => f.id === activeFileId);

  async function handleSave(content: string) {
    if (!activeFileId) return;
    try {
      await updateFile(projectId!, activeFileId, { content });
    } catch (err) {
      console.error("Failed to auto-save file", err);
    }
  }

  useEffect(() => {
    const handleTriggerSave = () => {
      // We don't have the content here easily since Monaco holds it, 
      // but Monaco uses Ctrl+S on its own. 
      // To simulate it, we can dispatch a keyboard event for Ctrl+S
      const evt = new KeyboardEvent('keydown', { ctrlKey: true, key: 's' });
      document.dispatchEvent(evt);
    };
    window.addEventListener('trigger-save-active-file', handleTriggerSave);
    return () => window.removeEventListener('trigger-save-active-file', handleTriggerSave);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      setShowCommandPalette(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const themeClass = settings.theme === 'vs-dark' ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-[#fffffe] text-[#333333]';

  return (
    <div className={`h-screen w-full flex flex-col ${themeClass} font-sans overflow-hidden`}>
      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      
      {/* Top Menu Bar */}
      <TopMenuBar />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* VS Code Left Activity Bar */}
        <ActivityBar />

        {/* VS Code Primary Sidebar (Explorer, Search, Source Control) */}
        <Sidebar projectId={projectId} />

        {/* VS Code Editor Area */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0 bg-[#1e1e1e]">
          {/* Tab bar */}
          <EditorTabs />

          <div className="flex flex-col flex-1 overflow-hidden relative">
            {activeFile ? (
              <div className="flex-1 overflow-hidden">
                <MonacoEditor
                  key={activeFileId} 
                  fileId={activeFile.id}
                  fileName={activeFile.name}
                  language={activeFile.language || 'plaintext'}
                  initialContent={activeFile.content || ''}
                  onContentChange={() => {}}
                  onSave={handleSave}
                />
              </div>
            ) : (
              /* Empty state / Welcome Screen */
              <div
                className={`flex-1 flex flex-col items-center justify-center select-none ${settings.theme === 'vs-dark' ? 'bg-[#1e1e1e]' : 'bg-gray-100'}`}
              >
                <div className="flex items-center justify-center w-24 h-24 mb-6">
                  <svg className={`w-20 h-20 ${settings.theme === 'vs-dark' ? 'text-[#333333]' : 'text-gray-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                <h2 className={`text-xl mb-2 font-light ${settings.theme === 'vs-dark' ? 'text-gray-400' : 'text-gray-600'}`}>DevCollab IDE</h2>
                
                <div className="flex gap-12 text-xs text-gray-500 font-mono mt-8">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between w-64"><span className="text-gray-400">Show All Commands</span> <span>Ctrl+Shift+P</span></div>
                    <div className="flex justify-between w-64"><span className="text-gray-400">Go to File</span> <span>Ctrl+P</span></div>
                    <div className="flex justify-between w-64"><span className="text-gray-400">Save File</span> <span>Ctrl+S</span></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* VS Code Bottom Panel */}
            <BottomPanel />
          </div>
        </div>
      </div>
      
      {/* VS Code Status Bar */}
      <div className={`h-6 flex items-center justify-between px-3 text-[11px] select-none ${settings.theme === 'vs-dark' ? 'bg-[#007acc] text-white' : 'bg-[#007acc] text-white'}`}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1 rounded"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg> main</span>
          <span className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1 rounded"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> 0</span>
          <span className="flex items-center gap-1 cursor-pointer hover:bg-white/20 px-1 rounded"><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> 0</span>
        </div>
        <div className="flex items-center gap-4">
          {activeFile && (
            <>
              <span className="cursor-pointer hover:bg-white/20 px-1 rounded">UTF-8</span>
              <span className="cursor-pointer hover:bg-white/20 px-1 rounded">{activeFile.language || 'plaintext'}</span>
            </>
          )}
          <span className="cursor-pointer hover:bg-white/20 px-1 rounded">DevCollab IDE</span>
        </div>
      </div>
    </div>
  );
}
