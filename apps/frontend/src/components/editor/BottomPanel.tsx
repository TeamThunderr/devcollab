import useEditorStore from "../../stores/editorStore";
import { X } from "lucide-react";
import TerminalPanel from "./TerminalPanel";
import ProblemsPanel from "./ProblemsPanel";
import { useParams } from "react-router-dom";

export default function BottomPanel() {
  const { layout, updateLayout } = useEditorStore();
  const { projectId } = useParams();

  if (!layout.bottomPanelActive) return null;

  const tabs = [
    { id: 'problems', label: 'PROBLEMS' },
    { id: 'output', label: 'OUTPUT' },
    { id: 'debug', label: 'DEBUG CONSOLE' },
    { id: 'terminal', label: 'TERMINAL' },
  ] as const;

  return (
    <div 
      className="flex flex-col bg-[#1e1e1e] border-t border-[#333333] select-none"
      style={{ height: layout.bottomPanelHeight }}
    >
      <div className="flex items-center justify-between px-4 h-[35px] border-b border-[#333333]">
        <div className="flex gap-4 h-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => projectId && updateLayout(projectId, { bottomPanelActive: tab.id })}
              className={`text-xs uppercase tracking-wider h-full border-b border-transparent transition-colors ${
                layout.bottomPanelActive === tab.id 
                  ? 'text-white border-white' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button 
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
            onClick={() => projectId && updateLayout(projectId, { bottomPanelActive: null })}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {layout.bottomPanelActive === 'terminal' && <TerminalPanel projectId={projectId!} />}
        {layout.bottomPanelActive === 'output' && <TerminalPanel projectId={projectId!} showOutputOnly />}
        {layout.bottomPanelActive === 'problems' && <ProblemsPanel />}
        {layout.bottomPanelActive === 'debug' && <div className="p-4 text-xs text-gray-500">Debug Console: Not connected</div>}
      </div>
    </div>
  );
}
