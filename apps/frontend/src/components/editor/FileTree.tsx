import React, { useState, useEffect } from "react";
import useEditorStore from "../../stores/editorStore";

export interface FileTreeProps {
  projectId: string;
}

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript",
    py: "python", java: "java",
    cpp: "cpp", cc: "cpp", go: "go",
    json: "json", html: "html", css: "css",
  };
  return map[ext] ?? "plaintext";
}

function fileIcon(language: string): string {
  const icons: Record<string, string> = {
    typescript: "🟨", javascript: "🟨",
    python: "🐍", java: "☕", cpp: "⚙️", go: "🔵",
    json: "📄", html: "🌐", css: "🎨",
  };
  return icons[language] ?? "📄";
}

export default function FileTree({ projectId }: FileTreeProps) {
  const { files, activeFileId, openTab, fetchFileTree, createFile, updateFile, deleteFile, isLoading } = useEditorStore();
  const [showModal, setShowModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState("");

  useEffect(() => {
    fetchFileTree(projectId);
  }, [projectId, fetchFileTree]);

  async function handleCreate() {
    const name = newFileName.trim();
    if (!name) return;
    try {
      await createFile(projectId, {
        name,
        type: 'file',
        language: detectLanguage(name),
        content: ""
      });
      setNewFileName("");
      setShowModal(false);
    } catch (err) {
      // Error handled by store
    }
  }

  async function handleDelete(fileId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await deleteFile(projectId, fileId);
    } catch (err) {
      // Error handled by store
    }
  }

  async function handleRenameSubmit(fileId: string, oldName: string) {
    const name = editFileName.trim();
    setEditingFileId(null);
    if (!name || name === oldName) return;

    try {
      await updateFile(projectId, fileId, { name, language: detectLanguage(name) });
    } catch (err) {
      // Error handled by store
    }
  }

  function startRename(fileId: string, currentName: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingFileId(fileId);
    setEditFileName(currentName);
  }

  return (
    <>
      <div className="w-56 h-full bg-[#1e1e1e] border-r border-[#2d2d2d] flex flex-col flex-shrink-0 select-none">
        <div className="px-4 py-3 border-b border-[#2d2d2d] flex items-center justify-between group">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Explorer</span>
          <button type="button" onClick={() => { setNewFileName(""); setShowModal(true); }}
            className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
            title="New File">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="px-4 py-2 text-xs text-gray-500 italic">Loading...</div>
          ) : files.length === 0 ? (
            <div className="px-4 py-4 text-xs text-center text-gray-500">
              <p className="mb-2">No files in project.</p>
              <button onClick={() => setShowModal(true)} className="text-blue-400 hover:text-blue-300 hover:underline">Create a file</button>
            </div>
          ) : files.map((file) => (
            <div key={file.id} 
              className={`group w-full flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm transition-colors
                ${activeFileId === file.id ? "bg-[#37373d] text-white" : "text-gray-300 hover:text-white hover:bg-[#2a2d2e]"}`}
              onClick={() => { if (editingFileId !== file.id) openTab(file.id); }}>
              
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <span className="text-sm opacity-80" aria-hidden="true">{fileIcon(file.language || 'plaintext')}</span>
                {editingFileId === file.id ? (
                  <input autoFocus type="text" value={editFileName}
                    onChange={(e) => setEditFileName(e.target.value)}
                    onBlur={() => handleRenameSubmit(file.id, file.name)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(file.id, file.name); if (e.key === "Escape") setEditingFileId(null); }}
                    className="w-full bg-[#3c3c3c] border border-blue-500 rounded px-1 text-white text-sm outline-none"
                    onClick={(e) => e.stopPropagation()} />
                ) : (
                  <span className="truncate">{file.name}</span>
                )}
              </div>

              {/* Actions */}
              {editingFileId !== file.id && (
                <div className="hidden group-hover:flex items-center gap-1 ml-2">
                  <button type="button" onClick={(e) => startRename(file.id, file.name, e)} className="text-gray-400 hover:text-gray-200 p-1 hover:bg-white/10 rounded" title="Rename">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button type="button" onClick={(e) => handleDelete(file.id, e)} className="text-gray-400 hover:text-red-400 p-1 hover:bg-white/10 rounded" title="Delete">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}>
          <div className="bg-[#1e1e1e] rounded-xl p-5 w-80 border border-[#333] shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Create New File</h3>
            <input autoFocus type="text" value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowModal(false); }}
              placeholder="filename.ts"
              className="w-full bg-[#2d2d2d] border border-[#444] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors mb-2" />
            
            <div className="h-4">
              {newFileName && <p className="text-xs text-gray-400">Language: <span className="text-blue-400">{detectLanguage(newFileName)}</span></p>}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-lg transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleCreate} disabled={!newFileName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Create File
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
