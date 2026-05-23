import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import SlashCommands, { getSuggestionItems, renderItems } from './SlashCommands';

import useWikiStore from '../../stores/wikiStore';
import useTaskStore from '../../stores/taskStore';
import useEditorStore from '../../stores/editorStore';

const lowlight = createLowlight(common);

export default function WikiEditor({ projectId, onToggleHistory }: { projectId: string; onToggleHistory?: () => void }) {
  const { activePage, updatePage, saveStatus, createVersion, editorVersion } = useWikiStore();
  const { tasks, fetchTasksByProject } = useTaskStore();
  const { files, fetchFileTree } = useEditorStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch tasks and files to populate the link dropdowns
  useEffect(() => {
    fetchTasksByProject(projectId);
    fetchFileTree(projectId);
  }, [projectId]);

  // Auto-save logic
  const handleUpdate = useCallback(
    ({ editor }: { editor: any }) => {
      if (!activePage) return;
      const html = editor.getHTML();
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(() => {
        updatePage(activePage.id, { content: html });
      }, 2000);
    },
    [activePage, updatePage]
  );

  const extensions = useMemo(() => [
    StarterKit.configure({
      codeBlock: false,
    }),
    Markdown.configure({
      html: true,
      transformCopiedText: true,
      transformPastedText: true,
    }),
    Underline,
    Link.configure({ openOnClick: false }),
    Image.configure({
      HTMLAttributes: {
        class: 'rounded-lg max-w-full h-auto',
      },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: 'border-collapse table-auto w-full' },
    }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.configure({
      lowlight,
      HTMLAttributes: { class: 'bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm shadow-inner' },
    }),
    Placeholder.configure({
      placeholder: 'Press "/" for commands, or start typing...',
    }),
    SlashCommands.configure({
      suggestion: {
        items: getSuggestionItems,
        render: renderItems,
      },
    }),
  ], []);

  const editor = useEditor({
    extensions,
    content: activePage?.content || '',
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-headings:font-bold prose-a:text-blue-400 max-w-none focus:outline-none min-h-[500px] leading-relaxed',
      },
    },
  });

  // Sync content if active page changes or version is restored
  useEffect(() => {
    if (editor && activePage && editor.getHTML() !== activePage.content) {
      editor.commands.setContent(activePage.content || '');
    }
  }, [activePage?.id, editorVersion]);

  if (!activePage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1e1e] text-gray-500">
        <div className="w-16 h-16 rounded-full bg-[#252526] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </div>
        <p>Select a page or create a new one to start writing.</p>
      </div>
    );
  }

  const handleManualSave = async () => {
    if (!editor) return;
    await updatePage(activePage.id, { content: editor.getHTML() });
    await createVersion(activePage.id);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3000/api/wiki/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: `http://localhost:3000${data.url}` }).run();
      }
    } catch (err) {
      console.error('Image upload failed', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Editor Header / Toolbar */}
      <div className="h-14 border-b border-[#2d2d2d] flex items-center justify-between px-6 shrink-0 bg-[#252526] sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            value={activePage.title}
            onChange={(e) => updatePage(activePage.id, { title: e.target.value })}
            className="bg-transparent text-2xl font-bold text-gray-200 outline-none w-96 placeholder-gray-600"
            placeholder="Page Title"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={activePage.linkedTaskId || ''}
            onChange={(e) => updatePage(activePage.id, { linkedTaskId: e.target.value || null } as any)}
            className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-xs text-gray-300 outline-none w-32 focus:border-blue-500 transition-colors"
          >
            <option value="">-- No Task Linked --</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>

          <select
            value={activePage.linkedFileId || ''}
            onChange={(e) => updatePage(activePage.id, { linkedFileId: e.target.value || null } as any)}
            className="bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 text-xs text-gray-300 outline-none w-32 focus:border-blue-500 transition-colors"
          >
            <option value="">-- No File Linked --</option>
            {files.filter(f => f.type === 'file').map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          <span className="text-xs text-gray-500 font-medium w-16 text-center">
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && <span className="text-red-400">Error</span>}
          </span>
          <button 
            onClick={onToggleHistory}
            className="text-xs bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 px-3 py-1.5 rounded shadow-sm transition-all flex items-center gap-2 border border-[#444] mr-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            History
          </button>
          <button 
            onClick={handleManualSave}
            className="text-xs bg-[#333] hover:bg-[#444] text-white px-3 py-1.5 rounded shadow-sm transition-all flex items-center gap-2 border border-[#444]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Save Snapshot
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {editor && (
        <div className="px-6 py-2 border-b border-[#2d2d2d] bg-[#252526]/50 flex gap-1 items-center flex-wrap shrink-0 sticky top-14 z-10 backdrop-blur-sm shadow-sm">
          <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-md border border-[#333]">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon="B" className="font-bold" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon="I" className="italic" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon="U" className="underline" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon="S" className="line-through" />
          </div>

          <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-md border border-[#333] ml-2">
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon="H1" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon="H2" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} icon="H3" />
          </div>

          <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-md border border-[#333] ml-2">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon="• List" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon="1. List" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} icon="☑ Task" />
          </div>

          <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-md border border-[#333] ml-2">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon="'' Quote" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} icon="</> Code" />
          </div>

          <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-md border border-[#333] ml-2">
            <ToolbarButton 
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
              active={editor.isActive('table')} 
              icon="⊞ Table" 
            />
            {editor.isActive('table') && (
              <>
                <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} icon="+ Col" />
                <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} icon="- Col" />
                <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} icon="+ Row" />
                <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} icon="- Row" />
                <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} icon="Del Tbl" />
              </>
            )}
          </div>

          <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-md border border-[#333] ml-2 relative">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <ToolbarButton 
              onClick={() => fileInputRef.current?.click()} 
              icon={isUploading ? "..." : "🖼️ Image"} 
              disabled={isUploading}
            />
          </div>

          <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-md border border-[#333] ml-auto">
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon="↺" />
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon="↻" />
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto px-12 py-12 bg-[#1e1e1e] custom-scrollbar">
        <div className="max-w-4xl mx-auto bg-[#1e1e1e]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, active, disabled, icon, className = '' }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${
        active ? 'bg-blue-600/20 text-blue-400 shadow-inner' : 'text-gray-400 hover:bg-[#333] hover:text-gray-100 hover:shadow-sm'
      } ${className}`}
    >
      {icon}
    </button>
  );
}
