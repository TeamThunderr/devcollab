import React, { useState, useRef, useEffect } from "react";
import useEditorStore from "../../stores/editorStore";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";

export default function TopMenuBar() {
  const { 
    updateSettings, 
    updateLayout, 
    settings, 
    executeCode, 
    activeFileId, 
    files, 
    closeTab, 
    layout 
  } = useEditorStore();
  
  const { pid: projectId, workspaceId } = useParams();
  const navigate = useNavigate();
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showVSCodeModal, setShowVSCodeModal] = useState(false);
  const [hasJoinedWaitlist, setHasJoinedWaitlist] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeFile = files.find(f => f.id === activeFileId);

  const handleJoinWaitlist = async () => {
    setIsJoiningWaitlist(true);
    try {
      const response = await api.post('/api/waitlist/join');
      setWaitlistPosition(response.data.position);
      setHasJoinedWaitlist(true);
    } catch (e) {
      console.error("Failed to join waitlist:", e);
    } finally {
      setIsJoiningWaitlist(false);
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    if (activeMenu === menu) {
      setActiveMenu(null);
    } else {
      setActiveMenu(menu);
    }
  };

  const handleMouseEnter = (menu: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menu);
    }
  };

  const MenuItem = ({ label, shortcut, onClick }: { label: string, shortcut?: string, onClick: () => void }) => (
    <div 
      className="px-4 py-1.5 hover:bg-[#0060a0] hover:text-white cursor-pointer flex justify-between items-center min-w-[200px]"
      onClick={() => {
        onClick();
        setActiveMenu(null);
      }}
    >
      <span>{label}</span>
      {shortcut && <span className="text-gray-500 text-[11px] ml-4 group-hover:text-gray-300">{shortcut}</span>}
    </div>
  );

  const MenuDivider = () => <div className="h-px bg-[#454545] my-1 mx-2" />;

  const triggerNewFile = () => {
    window.dispatchEvent(new CustomEvent('open-new-file-modal'));
  };

  return (
    <div ref={menuRef} className={`h-[35px] flex items-center justify-between px-2 text-[13px] select-none ${settings.theme === 'vs-dark' ? 'bg-[#333333] text-[#cccccc]' : 'bg-[#dddddd] text-[#333333]'}`}>
      <div className="flex items-center h-full">
        {/* VS Code Logo */}
        <div className="w-8 flex justify-center text-blue-500 mr-1">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 0l-12.5 4.5v15l12.5 4.5 6.5-5v-14l-6.5-5zM2 6.5l3.5-1.5v14l-3.5-1.5v-11z"/></svg>
        </div>

        {/* File Menu */}
        <div className="relative h-full flex items-center">
          <div 
            className={`px-2 h-full flex items-center cursor-pointer hover:bg-white/10 ${activeMenu === 'File' ? 'bg-white/10' : ''}`}
            onClick={() => handleMenuClick('File')}
            onMouseEnter={() => handleMouseEnter('File')}
          >
            File
          </div>
          {activeMenu === 'File' && (
            <div className="absolute top-8 left-0 bg-[#252526] border border-[#454545] shadow-xl py-1 z-50 text-[#cccccc] rounded-md min-w-[250px]">
              <MenuItem label="New File..." shortcut="Ctrl+N" onClick={triggerNewFile} />
              <MenuItem label="New Folder..." onClick={() => {}} />
              <MenuDivider />
              <MenuItem label="Open File..." shortcut="Ctrl+O" onClick={() => document.getElementById('local-file-upload')?.click()} />
              <MenuItem label="Open Folder..." shortcut="Ctrl+K Ctrl+O" onClick={() => document.getElementById('local-folder-upload')?.click()} />
              <MenuDivider />
              <MenuItem label="Save" shortcut="Ctrl+S" onClick={() => {
                 window.dispatchEvent(new CustomEvent('trigger-save-active-file'));
              }} />
              <MenuDivider />
              <MenuItem label="Close Editor" shortcut="Ctrl+W" onClick={() => {
                if (projectId && activeFileId) closeTab(projectId, activeFileId);
              }} />
            </div>
          )}
          
          {/* Hidden file inputs for local uploads */}
          <input 
            type="file" 
            id="local-file-upload" 
            className="hidden" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !projectId) return;
              
              const reader = new FileReader();
              reader.onload = async (ev) => {
                const content = ev.target?.result as string;
                // detect language naively
                const ext = file.name.split('.').pop()?.toLowerCase() || '';
                const map: Record<string, string> = {
                  ts: "typescript", tsx: "typescript",
                  js: "javascript", jsx: "javascript",
                  py: "python", java: "java",
                  cpp: "cpp", cc: "cpp", go: "go",
                  json: "json", html: "html", css: "css",
                };
                const lang = map[ext] || 'plaintext';
                
                try {
                  await useEditorStore.getState().createFile(projectId, {
                    name: file.name,
                    path: file.name,
                    type: 'file',
                    language: lang,
                    content
                  });
                } catch (err) {
                  console.error("Failed to upload file", err);
                }
              };
              reader.readAsText(file);
              // Reset input
              e.target.value = '';
              setActiveMenu(null);
            }} 
          />
          <input 
            type="file" 
            id="local-folder-upload" 
            className="hidden" 
            // @ts-ignore
            webkitdirectory="true" 
            directory="true"
            multiple 
            onChange={async (e) => {
              const files = e.target.files;
              if (!files || !projectId) return;
              
              for (let i = 0; i < files.length; i++) {
                const file = files[i];
                // file.webkitRelativePath gives the full path relative to the selected folder
                const path = file.webkitRelativePath || file.name;
                const name = file.name;
                
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const content = ev.target?.result as string;
                  const ext = name.split('.').pop()?.toLowerCase() || '';
                  const map: Record<string, string> = {
                    ts: "typescript", tsx: "typescript",
                    js: "javascript", jsx: "javascript",
                    py: "python", java: "java",
                    cpp: "cpp", cc: "cpp", go: "go",
                    json: "json", html: "html", css: "css",
                  };
                  const lang = map[ext] || 'plaintext';
                  
                  try {
                    await useEditorStore.getState().createFile(projectId, {
                      name,
                      path,
                      type: 'file',
                      language: lang,
                      content
                    });
                  } catch (err) {
                    console.error("Failed to upload file", err);
                  }
                };
                reader.readAsText(file);
              }
              // Reset input
              e.target.value = '';
              setActiveMenu(null);
            }} 
          />
        </div>

        {/* Edit Menu */}
        <div className="relative h-full flex items-center">
          <div 
            className={`px-2 h-full flex items-center cursor-pointer hover:bg-white/10 ${activeMenu === 'Edit' ? 'bg-white/10' : ''}`}
            onClick={() => handleMenuClick('Edit')}
            onMouseEnter={() => handleMouseEnter('Edit')}
          >
            Edit
          </div>
          {activeMenu === 'Edit' && (
            <div className="absolute top-8 left-0 bg-[#252526] border border-[#454545] shadow-xl py-1 z-50 text-[#cccccc] rounded-md min-w-[250px]">
              <MenuItem label="Undo" shortcut="Ctrl+Z" onClick={() => document.execCommand('undo')} />
              <MenuItem label="Redo" shortcut="Ctrl+Y" onClick={() => document.execCommand('redo')} />
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="relative h-full flex items-center">
          <div 
            className={`px-2 h-full flex items-center cursor-pointer hover:bg-white/10 ${activeMenu === 'View' ? 'bg-white/10' : ''}`}
            onClick={() => handleMenuClick('View')}
            onMouseEnter={() => handleMouseEnter('View')}
          >
            View
          </div>
          {activeMenu === 'View' && (
            <div className="absolute top-8 left-0 bg-[#252526] border border-[#454545] shadow-xl py-1 z-50 text-[#cccccc] rounded-md min-w-[250px]">
              <MenuItem label="Command Palette..." shortcut="Ctrl+Shift+P" onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'P' }));
              }} />
              <MenuDivider />
              <MenuItem label="Explorer" shortcut="Ctrl+Shift+E" onClick={() => updateLayout(projectId!, { activityBarActive: 'explorer' })} />
              <MenuItem label="Search" shortcut="Ctrl+Shift+F" onClick={() => updateLayout(projectId!, { activityBarActive: 'search' })} />
              <MenuItem label="Source Control" shortcut="Ctrl+Shift+G" onClick={() => updateLayout(projectId!, { activityBarActive: 'source-control' })} />
              <MenuDivider />
              <MenuItem label="Terminal" shortcut="Ctrl+`" onClick={() => updateLayout(projectId!, { bottomPanelActive: 'terminal' })} />
            </div>
          )}
        </div>

        {/* Run Menu */}
        <div className="relative h-full flex items-center">
          <div 
            className={`px-2 h-full flex items-center cursor-pointer hover:bg-white/10 ${activeMenu === 'Run' ? 'bg-white/10' : ''}`}
            onClick={() => handleMenuClick('Run')}
            onMouseEnter={() => handleMouseEnter('Run')}
          >
            Run
          </div>
          {activeMenu === 'Run' && (
            <div className="absolute top-8 left-0 bg-[#252526] border border-[#454545] shadow-xl py-1 z-50 text-[#cccccc] rounded-md min-w-[250px]">
              <MenuItem label="Run Active File" onClick={() => {
                if (activeFile && activeFile.content) {
                  executeCode(projectId!, activeFile.language || 'javascript', activeFile.content);
                }
              }} />
            </div>
          )}
        </div>

        {/* Terminal Menu */}
        <div className="relative h-full flex items-center">
          <div 
            className={`px-2 h-full flex items-center cursor-pointer hover:bg-white/10 ${activeMenu === 'Terminal' ? 'bg-white/10' : ''}`}
            onClick={() => handleMenuClick('Terminal')}
            onMouseEnter={() => handleMouseEnter('Terminal')}
          >
            Terminal
          </div>
          {activeMenu === 'Terminal' && (
            <div className="absolute top-8 left-0 bg-[#252526] border border-[#454545] shadow-xl py-1 z-50 text-[#cccccc] rounded-md min-w-[250px]">
              <MenuItem label="New Terminal" onClick={() => updateLayout(projectId!, { bottomPanelActive: 'terminal' })} />
            </div>
          )}
        </div>
      </div>

      {/* Center Search / Command Palette Trigger */}
      <div className="flex-1 flex justify-center">
        <div 
          className="w-[400px] h-6 bg-white/10 hover:bg-white/20 border border-white/10 rounded-md flex items-center justify-center cursor-text text-gray-400 gap-2 transition-colors"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'P' }))}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <span className="text-[12px]">Search or run command</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pr-2">
         <button 
           onClick={() => setShowVSCodeModal(true)}
           className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors border border-blue-500 shadow-sm whitespace-nowrap"
         >
           Install DevCollab for VS Code
         </button>
         {/* Layout toggle icons */}
         <button className="hover:bg-white/10 p-1 rounded" title="Toggle Panel" onClick={() => {
           updateLayout(projectId!, { bottomPanelActive: layout.bottomPanelActive ? null : 'terminal' })
         }}>
           <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="15" x2="21" y2="15"></line></svg>
         </button>
      </div>

      {showVSCodeModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-8 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => {
                setShowVSCodeModal(false);
                setTimeout(() => setHasJoinedWaitlist(false), 300);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mb-6">
                {hasJoinedWaitlist ? (
                  <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                ) : (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 0l-12.5 4.5v15l12.5 4.5 6.5-5v-14l-6.5-5zM2 6.5l3.5-1.5v14l-3.5-1.5v-11z"/></svg>
                )}
              </div>
              <h2 className="text-xl font-bold text-white mb-3">
                {hasJoinedWaitlist ? "You're on the list!" : "DevCollab VS Code Extension"}
              </h2>
              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                {hasJoinedWaitlist ? (
                  <>
                    Awesome! You've successfully joined the waitlist. <br/><br/>
                    There are currently <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded">{waitlistPosition?.toLocaleString() ?? "1,428"}</span> people ahead of you in the queue. We'll notify you when your turn arrives!
                  </>
                ) : (
                  "DevCollab VS Code Extension is currently in closed beta. Join the waitlist to sync your local editor directly with your workspace!"
                )}
              </p>
              {hasJoinedWaitlist ? (
                <button 
                  onClick={() => {
                    setShowVSCodeModal(false);
                  }}
                  className="w-full py-2.5 bg-[#333] hover:bg-[#444] text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              ) : (
                <button 
                  onClick={handleJoinWaitlist}
                  disabled={isJoiningWaitlist}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                >
                  {isJoiningWaitlist ? "Joining..." : "Join Waitlist"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
