/**
 * apps/frontend/src/components/editor/MonacoEditor.tsx
 *
 * Real Monaco code editor with auto-save, dirty state indicator,
 * and an imperative handle to read current content from outside.
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Editor, { type OnChange } from "@monaco-editor/react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Editor options ───────────────────────────────────────────────────────────

const EDITOR_OPTIONS = {
  fontSize: 13,
  minimap: { enabled: false },
  wordWrap: "on" as const,
  lineNumbers: "on" as const,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  padding: { top: 12 },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(
  (
    {
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

    // Expose getCurrentContent() to parent via ref
    useImperativeHandle(ref, () => ({
      getCurrentContent: () => content,
    }));

    const handleChange: OnChange = (newValue) => {
      const value = newValue ?? "";
      setContent(value);
      setIsDirty(true);
      onContentChange(value);

      // Debounced auto-save — 1500ms after last keystroke
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onSave(value);
        setIsDirty(false);
      }, 1500);
    };

    return (
      <div className="flex flex-col h-full">
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div
          className="h-8 bg-gray-900 border-b border-gray-700
                     flex items-center justify-between px-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{fileName}</span>
            {isDirty ? (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs text-amber-400">Unsaved</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500">Saved</span>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-600">Ctrl+S to save</span>
        </div>

        {/* ── Monaco editor ────────────────────────────────────────────── */}
        <Editor
          height="100%"
          language={language}
          value={content}
          theme={theme}
          onChange={handleChange}
          options={EDITOR_OPTIONS}
          loading={
            <div
              className="flex items-center justify-center h-full
                         bg-gray-950 text-gray-500 text-sm"
            >
              Loading editor…
            </div>
          }
        />
      </div>
    );
  }
);

MonacoEditor.displayName = "MonacoEditor";

export default MonacoEditor;
