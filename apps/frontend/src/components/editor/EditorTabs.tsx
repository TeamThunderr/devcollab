import React from "react";
import useEditorStore from "../../stores/editorStore";

function fileIcon(language: string): string {
  const icons: Record<string, string> = {
    typescript: "🟨", javascript: "🟨",
    python: "🐍", java: "☕", cpp: "⚙️", go: "🔵",
    json: "📄", html: "🌐", css: "🎨",
  };
  return icons[language] ?? "📄";
}

export default function EditorTabs() {
  const { files, openTabs, activeFileId, openTab, closeTab } = useEditorStore();
  
  // Get actual file objects for open tabs
  const openFiles = openTabs.map(id => files.find(f => f.id === id)).filter(Boolean) as typeof files;

  if (openFiles.length === 0) {
    return (
      <div className="flex bg-[#1e1e1e] border-b border-[#2d2d2d] min-h-[35px] items-center">
      </div>
    );
  }

  return (
    <div className="flex bg-[#252526] overflow-x-auto min-h-[35px] select-none scrollbar-hide">
      {openFiles.map((file) => {
        const isActive = activeFileId === file.id;
        // In a full implementation, we'd track dirty state in store
        const isDirty = false; 

        return (
          <button
            key={file.id}
            type="button"
            onClick={() => openTab(file.id)}
            className={`flex items-center gap-2 px-3 min-w-[120px] max-w-[200px] cursor-pointer
                        whitespace-nowrap border-r border-[#2d2d2d] border-t border-t-transparent text-sm
                        transition-colors group h-[35px]
                        ${isActive
                          ? "bg-[#1e1e1e] text-white border-t-[#007acc]"
                          : "text-gray-400 hover:bg-[#2b2b2b]"
                        }`}
          >
            <span aria-hidden="true" className="text-sm opacity-80">{fileIcon(file.language || 'plaintext')}</span>
            <span className="truncate flex-1 text-left">{file.name}</span>

            {isDirty ? (
              <span className="w-2 h-2 rounded-full bg-white opacity-80 flex-shrink-0 ml-1 group-hover:hidden" />
            ) : null}

            {/* Close button */}
            <span
              role="button"
              tabIndex={0}
              aria-label={`Close ${file.name}`}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(file.id);
              }}
              className={`text-gray-400 hover:text-white hover:bg-white/10
                         rounded w-5 h-5 flex items-center justify-center
                         transition-colors flex-shrink-0 ml-1
                         ${isDirty ? 'hidden group-hover:flex' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </span>
          </button>
        );
      })}
    </div>
  );
}
