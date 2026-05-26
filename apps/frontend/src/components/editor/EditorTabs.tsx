import { useState, useMemo } from "react";
import useEditorStore from "../../stores/editorStore";
import { useSnippetStore } from "../../stores/snippetStore";
import useAuthStore from "../../stores/authStore";
import useWorkspaceStore from "../../stores/workspaceStore";
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
  const { createSnippet } = useSnippetStore();
  const { projectId } = useParams();
  const { user: currentUser } = useAuthStore();
  const { members } = useWorkspaceStore();

  const [showSnippetModal, setShowSnippetModal] = useState(false);
  const [snippetTitle, setSnippetTitle] = useState("");
  const [snippetDesc, setSnippetDesc] = useState("");

  // Frozen snapshot state to prevent race conditions during file swaps
  const [snapshotCode, setSnapshotCode] = useState("");
  const [snapshotLanguage, setSnapshotLanguage] = useState("");
  const [snapshotProjectId, setSnapshotProjectId] = useState("");

  const isViewer = useMemo(() => {
    if (!currentUser) return true;
    const wsMember = members.find(m => m.userId === currentUser.id);
    return wsMember?.role === 'VIEWER';
  }, [currentUser, members]);
  
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

        {!isViewer && (
          <button 
            title="Save as Snippet"
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 ml-2"
            onClick={() => {
              const activeFile = files.find(f => f.id === activeFileId);
              if (activeFile) {
                // Freeze snapshot immediately when clicked!
                const liveCode = (window as any).currentLiveEditorContent ?? activeFile.content ?? "";
                setSnapshotCode(liveCode);
                setSnapshotLanguage(activeFile.language || 'plaintext');
                setSnapshotProjectId(projectId || "");
                
                setSnippetTitle(activeFile.name);
                setShowSnippetModal(true);
              }
            }}
          >
            <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          </button>
        )}
      </div>

      {/* Snippet Modal */}
      {showSnippetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#17191d] border border-white/[0.04] rounded-2xl p-5 text-white shadow-2xl w-full max-w-sm space-y-4 font-sans text-left">
            <h2 className="text-sm font-bold text-white">Save as Snippet</h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Title</label>
                <input 
                  type="text" 
                  value={snippetTitle}
                  onChange={e => setSnippetTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-white/[0.04] rounded-lg px-3 py-2 outline-none focus:border-indigo-500/50 transition text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea 
                  value={snippetDesc}
                  onChange={e => setSnippetDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-white/[0.04] rounded-lg px-3 py-2 outline-none focus:border-indigo-500/50 transition text-slate-200 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.04]">
              <button 
                onClick={() => setShowSnippetModal(false)}
                className="px-4 py-2 text-xs font-bold hover:bg-white/[0.01] rounded-lg transition text-slate-400"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (snapshotProjectId) {
                    await createSnippet(snippetTitle, snapshotLanguage, snapshotCode, snippetDesc, [], snapshotProjectId);
                    setShowSnippetModal(false);
                    setSnippetDesc("");
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg transition shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
