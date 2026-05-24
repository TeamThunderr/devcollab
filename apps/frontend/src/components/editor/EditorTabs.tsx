import useEditorStore from "../../stores/editorStore";
import { X } from "lucide-react";
import { useParams } from "react-router-dom";

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
  const { pid: projectId } = useParams();
  
  const openFiles = openTabs.map(id => files.find(f => f.id === id)).filter(Boolean) as typeof files;

  if (openFiles.length === 0) {
    return <div className="flex bg-[#252526] min-h-[35px] items-center"></div>;
  }

  return (
    <div className="flex bg-[#2d2d2d] justify-between items-center min-h-[35px] select-none">
      <div className="flex overflow-x-auto scrollbar-hide flex-1">
        {openFiles.map((file) => {
          const isActive = activeFileId === file.id;

          return (
            <button
              key={file.id}
              type="button"
              onClick={() => projectId && openTab(projectId, file.id)}
              className={`flex items-center gap-2 px-3 min-w-[120px] max-w-[200px] cursor-pointer
                          whitespace-nowrap border-r border-[#1e1e1e] border-t-2 text-[13px]
                          transition-colors group h-[35px]
                          ${isActive
                            ? "bg-[#1e1e1e] text-white border-t-[#007acc]"
                            : "bg-[#2d2d2d] text-gray-400 hover:bg-[#2b2b2b] border-t-transparent"
                          }`}
            >
              <span aria-hidden="true" className="opacity-80 text-xs">{fileIcon(file.language || 'plaintext')}</span>
              <span className="truncate flex-1 text-left">{file.name}</span>


              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  if (projectId) closeTab(projectId, file.id);
                }}
                className={`text-gray-400 hover:text-white hover:bg-white/10
                           rounded w-5 h-5 flex items-center justify-center
                           transition-colors flex-shrink-0 ml-1
                           opacity-0 group-hover:opacity-100`}
              >
                <X size={14} />
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Tab bar right actions */}
      <div className="flex items-center px-2">
        <button 
          title="Run Code"
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
          onClick={() => {
            const activeFile = files.find(f => f.id === activeFileId);
            if (activeFile && activeFile.content && projectId) {
              // We need `executeCode` from store. Let's get it.
              useEditorStore.getState().executeCode(projectId, activeFile.language || 'javascript', activeFile.content);
            }
          }}
        >
          <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
