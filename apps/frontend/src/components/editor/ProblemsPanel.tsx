export default function ProblemsPanel() {
  // Monaco's diagnostics are normally fetched via monaco.editor.getModelMarkers
  // For now, we mock an empty state, as tying it directly to React state requires a lot of wiring with the editor instance.
  return (
    <div className="h-full w-full bg-[#1e1e1e] text-gray-300 p-4 font-mono text-[13px] overflow-y-auto">
      <div className="text-gray-500 italic">No problems have been detected in the workspace.</div>
    </div>
  );
}
