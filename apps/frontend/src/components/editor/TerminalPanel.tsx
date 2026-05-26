import React, { useState, useEffect, useRef } from "react";
import useEditorStore from "../../stores/editorStore";

export default function TerminalPanel({ projectId, showOutputOnly = false }: { projectId: string, showOutputOnly?: boolean }) {
  const { terminalOutput, terminalHistory, executeCommand } = useEditorStore();
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (input.trim()) {
        executeCommand(projectId, input);
        setInput("");
        setHistoryIndex(-1);
      }
    } else if (e.key === "ArrowUp") {
      if (terminalHistory.length > 0 && historyIndex < terminalHistory.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInput(terminalHistory[terminalHistory.length - 1 - nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInput(terminalHistory[terminalHistory.length - 1 - nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const displayOutput = showOutputOnly 
    ? terminalOutput.filter(o => o.type !== 'command' || o.content.startsWith('[')) 
    : terminalOutput;

  return (
    <div className="h-full w-full bg-[#1e1e1e] text-[#cccccc] font-mono text-[13px] p-2 overflow-y-auto flex flex-col cursor-text">
      <div className="flex-1">
        {displayOutput.map((item) => (
          <div key={item.id} className="whitespace-pre-wrap break-words leading-relaxed">
            {item.type === 'error' ? (
              <span className="text-red-400">{item.content}</span>
            ) : item.type === 'command' ? (
              <span className="text-blue-300">{item.content}</span>
            ) : (
              <span>{item.content}</span>
            )}
          </div>
        ))}
        {!showOutputOnly && (
          <div className="flex items-center mt-1">
            <span className="text-green-400 mr-2">$</span>
            <input 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-[#cccccc]"
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
