import { useState } from "react";
import useEditorStore from "../../stores/editorStore";

export default function SearchPanel({ projectId }: { projectId: string }) {
  const { files, openTab } = useEditorStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ fileId: string; fileName: string; line: number; match: string }[]>([]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const q = query.toLowerCase();
      if (!q) {
        setResults([]);
        return;
      }
      const newResults: typeof results = [];
      files.forEach(f => {
        if (!f.content) return;
        const lines = f.content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(q)) {
            newResults.push({ fileId: f.id, fileName: f.name, line: idx + 1, match: line.trim() });
          }
        });
      });
      setResults(newResults);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#252526] text-gray-300 p-4">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Search</div>
      
      <div className="mb-4">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search (Enter to submit)"
          className="w-full bg-[#3c3c3c] border border-transparent focus:border-[#007acc] rounded px-2 py-1 text-sm outline-none transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {results.length > 0 ? (
          <div className="text-xs">
            <div className="mb-2 text-gray-500">{results.length} results found</div>
            {results.map((r, i) => (
              <div 
                key={i} 
                className="py-1 cursor-pointer hover:bg-[#2a2d2e] rounded px-1 break-words"
                onClick={() => openTab(projectId, r.fileId)}
              >
                <div className="text-blue-400 font-medium">{r.fileName} <span className="text-gray-500">: {r.line}</span></div>
                <div className="opacity-80 pl-2 border-l border-gray-600 ml-1 truncate">{r.match}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500 mt-4 text-center">
            {query ? "No results found." : "Type to search"}
          </div>
        )}
      </div>
    </div>
  );
}
