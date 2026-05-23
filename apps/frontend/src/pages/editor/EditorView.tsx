import { useState, useEffect } from "react";
import FileTree from "../../components/editor/FileTree";
import EditorTabs from "../../components/editor/EditorTabs";
import MonacoEditor from "../../components/editor/MonacoEditor";
import AIReviewBar from "../../components/editor/AIReviewBar";
import useEditorStore from "../../stores/editorStore";
import api from "../../lib/axios";

export default function EditorView() {
  // Hardcoded for testing since user hasn't set up project navigation
  const projectId = "project-test-456"; 
  
  const { files, activeFileId, updateFile } = useEditorStore();
  const [showAIBar, setShowAIBar] = useState(true);
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [tasks, setTasks] = useState<{id: string, title: string}[]>([]);

  useEffect(() => {
    // Fetch tasks for task link dropdown
    api.get(`/api/tasks/project/${projectId}`)
      .then(res => setTasks(res.data || []))
      .catch(console.error);
  }, [projectId]);

  const activeFile = files.find(f => f.id === activeFileId);

  async function handleSave(content: string) {
    if (!activeFileId) return;
    try {
      await updateFile(projectId, activeFileId, { content });
    } catch (err) {
      console.error("Failed to auto-save file", err);
    }
  }

  async function handleTaskLink(taskId: string) {
    if (!activeFileId) return;
    try {
      await updateFile(projectId, activeFileId, { taskId: taskId || null });
    } catch (err) {
      console.error("Failed to link file to task", err);
    }
  }

  return (
    <div className={`h-screen flex flex-col ${theme === 'vs-dark' ? 'bg-[#1e1e1e] text-gray-300' : 'bg-gray-50 text-black'}`}>
      {/* Editor Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b select-none ${theme === 'vs-dark' ? 'border-[#2d2d2d] bg-[#333333]' : 'border-gray-300 bg-gray-200'}`}>
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold text-white tracking-wide">Monaco Code Editor</h1>
          <button 
            onClick={() => setTheme(theme === "vs-dark" ? "light" : "vs-dark")}
            className={`text-[11px] px-2 py-1 rounded-md transition-colors border ${theme === 'vs-dark' ? 'bg-[#252526] hover:bg-[#2d2d2d] border-[#3c3c3c] text-gray-300' : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700'}`}>
            {theme === "vs-dark" ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
        
        {/* Task Link UI */}
        {activeFile && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium tracking-wide">Link File to Task:</span>
            <select 
              value={activeFile.taskId || ""} 
              onChange={(e) => handleTaskLink(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-md outline-none transition-colors border ${theme === 'vs-dark' ? 'bg-[#252526] text-gray-200 border-[#3c3c3c] focus:border-[#007acc]' : 'bg-white text-black border-gray-300 focus:border-blue-500'}`}
            >
              <option value="">-- No Task Linked --</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree sidebar */}
        <FileTree projectId={projectId} />

        {/* Editor Area */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0 bg-[#1e1e1e]">
          {/* Tab bar */}
          <EditorTabs />

          <div className="flex flex-col flex-1 overflow-hidden relative">
            {activeFile ? (
              <>
                <div className="flex-1 overflow-hidden absolute inset-0 bottom-0">
                  <MonacoEditor
                    key={activeFileId} // Remount editor strictly when active file changes
                    fileId={activeFile.id}
                    fileName={activeFile.name}
                    language={activeFile.language || 'plaintext'}
                    initialContent={activeFile.content || ''}
                    onContentChange={() => {}}
                    onSave={handleSave}
                    theme={theme}
                  />
                </div>

                {/* AI review bar docked to bottom */}
                <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none flex flex-col justify-end h-full">
                  <div className="pointer-events-auto">
                    <AIReviewBar
                      code={activeFile.content || ''}
                      language={activeFile.language || 'plaintext'}
                      isVisible={showAIBar}
                      onToggle={() => setShowAIBar((p) => !p)}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Empty state / Welcome Screen */
              <div
                className={`flex-1 flex flex-col items-center justify-center select-none ${theme === 'vs-dark' ? 'bg-[#1e1e1e]' : 'bg-gray-100'}`}
              >
                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-[#252526] shadow-inner mb-6 border border-[#2d2d2d]">
                  <span className="text-5xl opacity-80" aria-hidden="true">{"{ }"}</span>
                </div>
                <h2 className={`text-xl font-medium mb-2 ${theme === 'vs-dark' ? 'text-gray-300' : 'text-gray-800'}`}>DevCollab Editor</h2>
                <p className={`text-sm mb-8 ${theme === 'vs-dark' ? 'text-gray-500' : 'text-gray-500'}`}>Select a file to start editing</p>
                
                <div className="flex gap-12 text-xs text-gray-500 font-mono">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between w-48"><span className="text-gray-400">Show Explorer</span> <span>Ctrl+Shift+E</span></div>
                    <div className="flex justify-between w-48"><span className="text-gray-400">Go to File</span> <span>Ctrl+P</span></div>
                    <div className="flex justify-between w-48"><span className="text-gray-400">Save File</span> <span>Ctrl+S</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
