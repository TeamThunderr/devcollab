/**
 * apps/frontend/src/components/editor/EditorTabs.tsx
 *
 * Horizontal tab bar for open files with dirty indicator and close button.
 */

import React from "react";
import type { CodeFile } from "./FileTree";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditorTabsProps {
  openFiles: CodeFile[];
  activeFileId: string | null;
  onTabClick: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
  dirtyFileIds: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fileIcon(language: string): string {
  const icons: Record<string, string> = {
    typescript: "🟨", javascript: "🟨",
    python: "🐍", java: "☕", cpp: "⚙️", go: "🔵",
  };
  return icons[language] ?? "📄";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditorTabs({
  openFiles,
  activeFileId,
  onTabClick,
  onTabClose,
  dirtyFileIds,
}: EditorTabsProps): React.ReactElement {
  if (openFiles.length === 0) {
    return (
      <div className="flex bg-gray-900 border-b border-gray-700 min-h-9 items-center">
        <span className="px-4 py-2 text-xs text-gray-600">
          Open a file from the tree →
        </span>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-900 border-b border-gray-700 overflow-x-auto min-h-9">
      {openFiles.map((file) => {
        const isActive = activeFileId === file.id;
        const isDirty = dirtyFileIds.includes(file.id);

        return (
          <button
            key={file.id}
            type="button"
            onClick={() => onTabClick(file.id)}
            className={`flex items-center gap-2 px-4 py-2 cursor-pointer
                        whitespace-nowrap border-r border-gray-700 text-xs
                        transition-colors duration-100 group
                        ${isActive
                          ? "bg-gray-800 text-white border-b-2 border-blue-500"
                          : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                        }`}
          >
            <span aria-hidden="true">{fileIcon(file.language)}</span>
            <span>{file.name}</span>

            {/* Dirty dot */}
            {isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            )}

            {/* Close button */}
            <span
              role="button"
              tabIndex={0}
              aria-label={`Close ${file.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(file.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onTabClose(file.id);
                }
              }}
              className="text-gray-600 hover:text-white hover:bg-gray-700
                         rounded w-4 h-4 flex items-center justify-center
                         transition-colors duration-100 flex-shrink-0
                         opacity-0 group-hover:opacity-100"
            >
              ×
            </span>
          </button>
        );
      })}
    </div>
  );
}
