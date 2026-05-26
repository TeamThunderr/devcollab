import useEditorStore from "../../stores/editorStore";
import { Files, Search, GitBranch, Settings, Play } from "lucide-react";
import { useParams } from "react-router-dom";

export default function ActivityBar() {
  const { layout, updateLayout } = useEditorStore();
  const { projectId } = useParams();

  const handleToggle = (view: 'explorer' | 'search' | 'source-control') => {
    // If clicking the active one, we could collapse the sidebar
    // For now we just switch or ensure it's open (in EditorView we handle width)
    if (projectId) {
      updateLayout(projectId, { activityBarActive: view });
    }
  };

  const navItems = [
    { id: 'explorer' as const, icon: Files, title: 'Explorer (Ctrl+Shift+E)' },
    { id: 'search' as const, icon: Search, title: 'Search (Ctrl+Shift+F)' },
    { id: 'source-control' as const, icon: GitBranch, title: 'Source Control (Ctrl+Shift+G)' },
  ];

  return (
    <div className="w-12 h-full bg-[#333333] flex flex-col items-center py-2 flex-shrink-0 z-10 select-none">
      <div className="flex-1 flex flex-col gap-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            title={item.title}
            onClick={() => handleToggle(item.id)}
            className={`p-2 rounded cursor-pointer relative flex justify-center w-full transition-colors ${
              layout.activityBarActive === item.id 
                ? 'text-white' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <item.icon size={24} strokeWidth={1.5} />
            {layout.activityBarActive === item.id && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-white" />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 pb-2">
        <button className="p-2 text-gray-500 hover:text-gray-300" title="Run Code" onClick={() => updateLayout(projectId || '', { bottomPanelActive: 'output' })}>
          <Play size={24} strokeWidth={1.5} />
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-300" title="Settings">
          <Settings size={24} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
