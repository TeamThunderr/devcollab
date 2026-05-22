import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect
} from "react";
import Editor, { type OnChange } from "@monaco-editor/react";

export interface MonacoEditorProps {
  fileId: string;
  fileName: string;
  language: string;
  initialContent: string;
  onContentChange: (content: string) => void;
  onSave: (content: string) => void;
  theme?: "vs-dark" | "light";
}

export interface MonacoEditorHandle {
  getCurrentContent: () => string;
}

const EDITOR_OPTIONS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  minimap: { enabled: true, scale: 0.75 },
  wordWrap: "on" as const,
  lineNumbers: "on" as const,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  padding: { top: 16 },
  formatOnPaste: true,
  autoIndent: "advanced" as const,
  matchBrackets: "always" as const,
  autoClosingBrackets: "always" as const,
  folding: true,
  renderLineHighlight: "all" as const,
} as const;

const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(
  (
    {
      fileId,
      fileName,
      language,
      initialContent,
      onContentChange,
      onSave,
      theme = "vs-dark",
    },
    ref
  ) => {
    const [content, setContent] = useState(initialContent);
    const [isDirty, setIsDirty] = useState(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset content when fileId changes
    useEffect(() => {
      setContent(initialContent);
      setIsDirty(false);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    }, [fileId, initialContent]);

    useImperativeHandle(ref, () => ({
      getCurrentContent: () => content,
    }));

    const handleChange: OnChange = (newValue) => {
      const value = newValue ?? "";
      setContent(value);
      setIsDirty(true);
      onContentChange(value);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onSave(value);
        setIsDirty(false);
      }, 1500); // 1.5s debounced auto-save
    };

    return (
      <div className="flex flex-col h-full bg-[#1e1e1e]">
        {/* Breadcrumb / Status Bar */}
        <div className="h-7 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center justify-between px-4 select-none">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{fileName}</span>
            <span className="text-gray-600">&gt;</span>
            <span className="text-[#007acc]">{language}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {isDirty ? (
              <div className="flex items-center gap-1.5 opacity-80">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[11px] text-blue-400">Saving...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 opacity-50">
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-[11px] text-gray-400">Saved</span>
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 relative">
          <Editor
            height="100%"
            language={language}
            value={content}
            theme={theme}
            onChange={handleChange}
            options={EDITOR_OPTIONS}
            loading={
              <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-500">Initializing Monaco Editor...</span>
                </div>
              </div>
            }
          />
        </div>
      </div>
    );
  }
);

MonacoEditor.displayName = "MonacoEditor";

export default MonacoEditor;
