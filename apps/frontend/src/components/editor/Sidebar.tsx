import useEditorStore from "../../stores/editorStore";
import FileTree from "./FileTree";
import SearchPanel from "./SearchPanel";
import SourceControlPanel from "./SourceControlPanel";

export interface SidebarProps {
  projectId: string;
}

export default function Sidebar({ projectId }: SidebarProps) {
  const { layout } = useEditorStore();

  return (
    <div 
      className="h-full bg-[#252526] border-r border-[#333333] flex flex-col flex-shrink-0"
      style={{ width: layout.sidebarWidth }}
    >
      {layout.activityBarActive === 'explorer' && <FileTree projectId={projectId} />}
      {layout.activityBarActive === 'search' && <SearchPanel projectId={projectId} />}
      {layout.activityBarActive === 'source-control' && <SourceControlPanel projectId={projectId} />}
    </div>
  );
}
