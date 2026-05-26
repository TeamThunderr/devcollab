import React, { useState, useEffect, useMemo } from "react";
import useEditorStore, { ProjectFile } from "../../stores/editorStore";
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen, Plus, Edit2, Trash2 } from "lucide-react";

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

// Tree node definition
type TreeNode = {
  name: string;
  path: string;
  isDirectory: boolean;
  file?: ProjectFile;
  children: Record<string, TreeNode>;
};

export default function FileTree({ projectId }: FileTreeProps) {
  const { files, activeFileId, openTab, fetchFileTree, createFile, updateFile, deleteFile, isLoading } = useEditorStore();
  const [showModal, setShowModal] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFileTree(projectId);
  }, [projectId, fetchFileTree]);

  useEffect(() => {
    const handleNewFileEvent = () => {
      setNewFilePath("");
      setShowModal(true);
    };
    window.addEventListener('open-new-file-modal', handleNewFileEvent);
    return () => window.removeEventListener('open-new-file-modal', handleNewFileEvent);
  }, []);

  // Build tree from flat files
  const tree = useMemo(() => {
    const root: TreeNode = { name: 'root', path: '', isDirectory: true, children: {} };
    
    files.forEach(file => {
      const parts = (file.path || file.name).split('/');
      let current = root;
      
      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join('/');
        
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: currentPath,
            isDirectory: !isLast,
            children: {}
          };
        }
        
        if (isLast) {
          current.children[part].file = file;
          current.children[part].isDirectory = false; // ensure it's marked as file
        }
        
        current = current.children[part];
      });
    });
    
    return root;
  }, [files]);

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  async function handleCreate() {
    const p = newFilePath.trim();
    if (!p) return;
    const name = p.split('/').pop() || p;
    try {
      await createFile(projectId, {
        name,
        path: p,
        type: 'file',
        language: detectLanguage(name),
        content: ""
      });
      setNewFilePath("");
      setShowModal(false);
      
      // Expand parents
      const parts = p.split('/');
      const newExpanded = new Set(expandedFolders);
      for (let i = 1; i < parts.length; i++) {
        newExpanded.add(parts.slice(0, i).join('/'));
      }
      setExpandedFolders(newExpanded);
      
    } catch (err) {}
  }

  async function handleDelete(fileId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await deleteFile(projectId, fileId);
    } catch (err) {}
  }

  async function handleRenameSubmit(fileId: string, oldPath: string) {
    const name = editFileName.trim();
    setEditingFileId(null);
    if (!name) return;

    const parts = oldPath.split('/');
    parts[parts.length - 1] = name;
    const newPath = parts.join('/');
    if (newPath === oldPath) return;

    try {
      await updateFile(projectId, fileId, { name, path: newPath, language: detectLanguage(name) });
    } catch (err) {}
  }

  function startRename(fileId: string, currentName: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingFileId(fileId);
    setEditFileName(currentName);
  }

  // Recursive render component
  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    if (node.name === 'root') {
      // Sort: folders first, then files alphabetically
      const sortedChildren = Object.values(node.children).sort((a, b) => {
        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
        return a.isDirectory ? -1 : 1;
      });
      return sortedChildren.map(child => renderNode(child, 0));
    }

    const isExpanded = expandedFolders.has(node.path);
    const isFile = !node.isDirectory && node.file;
    const isActive = isFile && activeFileId === node.file?.id;

    return (
      <div key={node.path}>
        <div 
          className={`group flex items-center justify-between py-[2px] pr-2 cursor-pointer text-[13px] select-none
            ${isActive ? "bg-[#37373d] text-white" : "text-gray-300 hover:text-white hover:bg-[#2a2d2e]"}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={(e) => {
            if (node.isDirectory) {
              toggleFolder(node.path, e);
            } else if (isFile && node.file && editingFileId !== node.file.id) {
              openTab(projectId, node.file.id);
            }
          }}
        >
          <div className="flex items-center gap-1.5 overflow-hidden flex-1">
            {node.isDirectory ? (
              <span className="text-gray-400 opacity-80" aria-hidden="true">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            ) : (
              <span className="w-[14px]" /> // spacing
            )}
            
            {node.isDirectory ? (
              isExpanded ? <FolderOpen size={14} className="text-blue-400" /> : <Folder size={14} className="text-blue-400" />
            ) : (
              <FileCode size={14} className="text-gray-400" />
            )}

            {isFile && editingFileId === node.file!.id ? (
              <input autoFocus type="text" value={editFileName}
                onChange={(e) => setEditFileName(e.target.value)}
                onBlur={() => handleRenameSubmit(node.file!.id, node.path)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(node.file!.id, node.path); if (e.key === "Escape") setEditingFileId(null); }}
                className="w-full bg-[#3c3c3c] border border-blue-500 rounded px-1 text-white text-xs outline-none"
                onClick={(e) => e.stopPropagation()} />
            ) : (
              <span className="truncate">{node.name}</span>
            )}
          </div>

          {isFile && editingFileId !== node.file!.id && (
            <div className="hidden group-hover:flex items-center gap-0.5 opacity-80">
              <button type="button" onClick={(e) => startRename(node.file!.id, node.name, e)} className="hover:text-gray-200 p-0.5 hover:bg-white/10 rounded" title="Rename">
                <Edit2 size={12} />
              </button>
              <button type="button" onClick={(e) => handleDelete(node.file!.id, e)} className="hover:text-red-400 p-0.5 hover:bg-white/10 rounded" title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>

        {node.isDirectory && isExpanded && (
          <div>
            {Object.values(node.children)
              .sort((a, b) => {
                if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
                return a.isDirectory ? -1 : 1;
              })
              .map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="w-full h-full bg-[#252526] flex flex-col flex-shrink-0 select-none overflow-hidden">
        <div className="px-4 py-2 border-b border-[#333333] flex items-center justify-between group">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Explorer</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => { setNewFilePath(""); setShowModal(true); }}
              className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
              title="New File">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {isLoading ? (
            <div className="px-4 py-2 text-xs text-gray-500 italic">Loading...</div>
          ) : files.length === 0 ? (
            <div className="px-4 py-4 text-xs text-center text-gray-500">
              <p className="mb-2">No files in project.</p>
              <button onClick={() => setShowModal(true)} className="text-blue-400 hover:text-blue-300 hover:underline">Create a file</button>
            </div>
          ) : (
            renderNode(tree)
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}>
          <div className="bg-[#1e1e1e] rounded-xl p-5 w-[400px] border border-[#333] shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Create New File</h3>
            <p className="text-xs text-gray-400 mb-2">Use slashes to create nested folders (e.g. <span className="text-blue-300">src/components/Button.tsx</span>)</p>
            <input autoFocus type="text" value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowModal(false); }}
              placeholder="filename.ts"
              className="w-full bg-[#2d2d2d] border border-[#444] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors mb-2" />
            
            <div className="h-4">
              {newFilePath && <p className="text-xs text-gray-400">Language: <span className="text-blue-400">{detectLanguage(newFilePath)}</span></p>}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-lg transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleCreate} disabled={!newFilePath.trim()}
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
