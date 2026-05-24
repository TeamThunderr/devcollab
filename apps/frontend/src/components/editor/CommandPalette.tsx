import React, { useState, useEffect, useRef } from "react";
import useEditorStore from "../../stores/editorStore";
import { useNavigate, useParams } from "react-router-dom";

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { updateSettings, settings, updateLayout, executeCode, activeFileId, files } = useEditorStore();
  const { pid: projectId, workspaceId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  const activeFile = files.find(f => f.id === activeFileId);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const commands = [
    { id: 'theme-dark', label: 'Preferences: Color Theme (Dark)', action: () => updateSettings(projectId!, { theme: 'vs-dark' }) },
    { id: 'theme-light', label: 'Preferences: Color Theme (Light)', action: () => updateSettings(projectId!, { theme: 'light' }) },
    { id: 'run-code', label: 'Run Active File', action: () => {
      if (activeFile && activeFile.content) {
        executeCode(projectId!, activeFile.language || 'javascript', activeFile.content);
      }
    }},
    { id: 'terminal-toggle', label: 'View: Toggle Terminal', action: () => updateLayout(projectId!, { bottomPanelActive: 'terminal' }) },
    { id: 'go-dashboard', label: 'Go to Dashboard', action: () => navigate(`/${workspaceId}`) },
  ];

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-start pt-[10vh]" onClick={onClose}>
      <div 
        className="w-[600px] bg-[#252526] border border-[#454545] rounded-lg shadow-2xl flex flex-col overflow-hidden text-gray-300 font-sans"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-2 border-b border-[#454545]">
          <input 
            ref={inputRef}
            type="text" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full bg-[#3c3c3c] border border-transparent focus:border-[#007acc] rounded px-3 py-2 text-[13px] outline-none transition-colors text-white"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length > 0 ? filtered.map((cmd) => (
            <div 
              key={cmd.id} 
              className="px-4 py-2 hover:bg-[#0060a0] hover:text-white cursor-pointer text-[13px]"
              onClick={() => {
                cmd.action();
                onClose();
              }}
            >
              {cmd.label}
            </div>
          )) : (
            <div className="px-4 py-2 text-[13px] text-gray-500">No matching commands</div>
          )}
        </div>
      </div>
    </div>
  );
}
