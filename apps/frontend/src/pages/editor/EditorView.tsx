/**
 * apps/frontend/src/pages/editor/EditorView.tsx
 *
 * Full-page code editor: FileTree → EditorTabs → MonacoEditor + AIReviewBar.
 */

import React, { useState } from "react";
import FileTree, { type CodeFile } from "../../components/editor/FileTree";
import EditorTabs from "../../components/editor/EditorTabs";
import MonacoEditor from "../../components/editor/MonacoEditor";
import AIReviewBar from "../../components/editor/AIReviewBar";

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditorView(): React.ReactElement {
  const [openFiles, setOpenFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [dirtyFileIds, setDirtyFileIds] = useState<string[]>([]);
  const [showAIBar, setShowAIBar] = useState(true);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  // ── Derived values ──────────────────────────────────────────────────────────
  const activeFile = openFiles.find((f) => f.id === activeFileId) ?? null;
  const activeContent = activeFileId ? (fileContents[activeFileId] ?? "") : "";
  const activeLanguage = activeFile?.language ?? "plaintext";

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleFileSelect(file: CodeFile): void {
    if (!openFiles.find((f) => f.id === file.id)) {
      setOpenFiles((prev) => [...prev, file]);
    }
    setActiveFileId(file.id);
    if (!(file.id in fileContents)) {
      setFileContents((prev) => ({ ...prev, [file.id]: file.content }));
    }
  }

  function handleTabClose(fileId: string): void {
    const remaining = openFiles.filter((f) => f.id !== fileId);
    setOpenFiles(remaining);
    if (activeFileId === fileId) {
      setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
    setDirtyFileIds((prev) => prev.filter((id) => id !== fileId));
  }

  function handleContentChange(fileId: string, content: string): void {
    setFileContents((prev) => ({ ...prev, [fileId]: content }));
    if (!dirtyFileIds.includes(fileId)) {
      setDirtyFileIds((prev) => [...prev, fileId]);
    }
  }

  function handleSave(fileId: string, content: string): void {
    setFileContents((prev) => ({ ...prev, [fileId]: content }));
    setDirtyFileIds((prev) => prev.filter((id) => id !== fileId));
    console.log("Auto-saved:", fileId);
    // TODO: real API call once teammate finishes editor persistence endpoint
  }

  // ── Layout ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Tab bar */}
      <EditorTabs
        openFiles={openFiles}
        activeFileId={activeFileId}
        onTabClick={setActiveFileId}
        onTabClose={handleTabClose}
        dirtyFileIds={dirtyFileIds}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <FileTree
          projectId="project-test-456"
          onFileSelect={handleFileSelect}
          activeFileId={activeFileId}
        />

        {/* Editor + AI bar */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {activeFile ? (
            <>
              {/* Monaco editor — key forces remount on file switch */}
              <div className="flex-1 overflow-hidden">
                <MonacoEditor
                  key={activeFileId}
                  fileId={activeFileId!}
                  fileName={activeFile.name}
                  language={activeLanguage}
                  initialContent={activeContent}
                  onContentChange={(c) => handleContentChange(activeFileId!, c)}
                  onSave={(c) => handleSave(activeFileId!, c)}
                  theme="vs-dark"
                />
              </div>

              {/* AI review bar docked to bottom */}
              <AIReviewBar
                code={activeContent}
                language={activeLanguage}
                isVisible={showAIBar}
                onToggle={() => setShowAIBar((p) => !p)}
              />
            </>
          ) : (
            /* Empty state */
            <div
              className="flex-1 flex flex-col items-center justify-center
                         bg-gray-950"
            >
              <span className="text-4xl mb-3" aria-hidden="true">📂</span>
              <p className="text-sm text-gray-500">Select a file to start editing</p>
              <p className="text-xs text-gray-600 mt-1">← Choose from the file tree</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
