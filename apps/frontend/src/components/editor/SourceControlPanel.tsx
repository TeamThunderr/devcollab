import useEditorStore from "../../stores/editorStore";

export default function SourceControlPanel({ projectId }: { projectId: string }) {
  const { files } = useEditorStore();
  
  // Since we don't have a real dirty state tracker yet (Monaco handles its own dirty),
  // we'll simulate a UI for Source Control that could be wired up later.
  return (
    <div className="flex flex-col h-full bg-[#252526] text-gray-300 p-4">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Source Control</div>
      
      <div className="mb-4">
        <input 
          type="text" 
          placeholder="Message (Ctrl+Enter to commit)"
          className="w-full bg-[#3c3c3c] border border-transparent focus:border-[#007acc] rounded px-2 py-1 text-sm outline-none transition-colors mb-2"
        />
        <button className="w-full bg-[#007acc] hover:bg-[#006bb3] text-white py-1 rounded text-sm transition-colors">
          Commit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="text-xs mb-2 flex items-center justify-between group">
          <span className="font-semibold text-gray-400">CHANGES</span>
          <span className="bg-gray-600 text-white rounded-full px-1.5 py-0.5 text-[10px]">0</span>
        </div>
        
        <div className="text-xs text-gray-500 italic px-2 py-4 text-center">
          There are no active changes to commit.
        </div>
      </div>
    </div>
  );
}
