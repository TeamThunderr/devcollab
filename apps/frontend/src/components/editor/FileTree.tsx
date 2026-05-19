/**
 * apps/frontend/src/components/editor/FileTree.tsx
 *
 * Left-panel file tree with new-file modal and language detection.
 */

import React, { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CodeFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
}

export interface FileTreeProps {
  projectId: string;
  onFileSelect: (file: CodeFile) => void;
  activeFileId: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript",
    py: "python", java: "java",
    cpp: "cpp", cc: "cpp", go: "go",
  };
  return map[ext] ?? "plaintext";
}

function fileIcon(language: string): string {
  const icons: Record<string, string> = {
    typescript: "🟨", javascript: "🟨",
    python: "🐍", java: "☕", cpp: "⚙️", go: "🔵",
  };
  return icons[language] ?? "📄";
}

const STARTER_FILES: CodeFile[] = [
  { id: "f1", name: "index.ts", path: "/index.ts", language: "typescript", content: "// Start coding here\n" },
  { id: "f2", name: "socket.ts", path: "/socket.ts", language: "typescript", content: 'import { Server } from "socket.io"\n\n// Socket setup\n' },
  { id: "f3", name: "utils.py", path: "/utils.py", language: "python", content: '# Python utilities\n\ndef hello():\n    return "Hello DevCollab"\n' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FileTree({ onFileSelect, activeFileId }: FileTreeProps): React.ReactElement {
  const [files, setFiles] = useState<CodeFile[]>(STARTER_FILES);
  const [showModal, setShowModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  function handleCreate(): void {
    const name = newFileName.trim();
    if (!name) return;
    const newFile: CodeFile = {
      id: Date.now().toString(), name,
      path: "/" + name, language: detectLanguage(name), content: "",
    };
    setFiles((prev) => [...prev, newFile]);
    onFileSelect(newFile);
    setNewFileName("");
    setShowModal(false);
  }

  return (
    <>
      <div className="w-44 h-full bg-gray-950 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Files</span>
          <button type="button" onClick={() => { setNewFileName(""); setShowModal(true); }}
            className="text-gray-500 hover:text-white text-lg leading-none transition-colors"
            aria-label="New file">+</button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {files.map((file) => (
            <button key={file.id} type="button" onClick={() => onFileSelect(file)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs transition-colors
                ${activeFileId === file.id ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}>
              <span aria-hidden="true">{fileIcon(file.language)}</span>
              <span className="max-w-28 truncate">{file.name}</span>
            </button>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 rounded-xl p-4 w-64 border border-gray-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-medium text-white mb-3">New File</p>
            <input autoFocus type="text" value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowModal(false); }}
              placeholder="e.g. auth.ts"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white
                placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {newFileName && <p className="text-xs text-gray-500 mt-1">Language: {detectLanguage(newFileName)}</p>}
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                Cancel</button>
              <button type="button" onClick={handleCreate} disabled={!newFileName.trim()}
                className="flex-1 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
