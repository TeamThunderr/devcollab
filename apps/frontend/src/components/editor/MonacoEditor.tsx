import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect
} from "react";
import Editor, { type OnChange, type Monaco } from "@monaco-editor/react";
import useEditorStore from "../../stores/editorStore";
import { useParams } from "react-router-dom";

export interface MonacoEditorProps {
  fileId: string;
  fileName: string;
  language: string;
  initialContent: string;
  onContentChange: (content: string) => void;
  onSave: (content: string) => void;
}

export interface MonacoEditorHandle {
  getCurrentContent: () => string;
}

const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(
  (
    {
      fileId,
      fileName,
      language,
      initialContent,
      onContentChange,
      onSave,
    },
    ref
  ) => {
    const { settings } = useEditorStore();
    const { projectId } = useParams();
    const [content, setContent] = useState(initialContent);
    const [isDirty, setIsDirty] = useState(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      }, 1500); 
    };

    const handleEditorMount = (editor: any, monaco: Monaco) => {
      // Add Ctrl+S action
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave(editor.getValue());
        setIsDirty(false);
      });
    };

    const EDITOR_OPTIONS = {
      fontSize: settings.fontSize,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      minimap: { enabled: settings.minimap, scale: 0.75 },
      wordWrap: settings.wordWrap,
      lineNumbers: "on" as const,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: settings.tabSize,
      padding: { top: 16 },
      formatOnPaste: true,
      autoIndent: "advanced" as const,
      matchBrackets: "always" as const,
      autoClosingBrackets: "always" as const,
      folding: true,
      renderLineHighlight: "all" as const,
      bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
      stickyScroll: { enabled: true },
      smoothScrolling: true,
      multiCursorModifier: 'alt' as const,
    };

    return (
      <div className={`flex flex-col h-full ${settings.theme === 'vs-dark' ? 'bg-[#1e1e1e]' : 'bg-[#fffffe]'}`}>
        <div className={`h-[22px] border-b flex items-center justify-between px-4 select-none ${settings.theme === 'vs-dark' ? 'border-[#2d2d2d] bg-[#1e1e1e]' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>{projectId}</span>
            <span className="text-gray-600">&gt;</span>
            <span className={settings.theme === 'vs-dark' ? 'text-[#cccccc]' : 'text-gray-800'}>{fileName}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {isDirty ? (
              <div className="flex items-center gap-1.5 opacity-80">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[11px] text-blue-400">Saving...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 opacity-50">
                <span className="text-[11px] text-gray-400">Saved</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          <Editor
            height="100%"
            language={language}
            value={content}
            theme={settings.theme}
            onChange={handleChange}
            options={EDITOR_OPTIONS}
            onMount={handleEditorMount}
            loading={
              <div className={`absolute inset-0 flex items-center justify-center ${settings.theme === 'vs-dark' ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-[#007acc] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-gray-500">Initializing Monaco Editor...</span>
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
