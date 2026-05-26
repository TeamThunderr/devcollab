import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
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
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Dropcursor from '@tiptap/extension-dropcursor';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import EmojiPicker, { Theme } from 'emoji-picker-react';

import SlashCommands, { getSuggestionItems, renderItems } from './SlashCommands';
import { Callout } from './extensions/Callout';

import useWikiStore from '../../stores/wikiStore';
import useTaskStore from '../../stores/taskStore';
import useEditorStore from '../../stores/editorStore';
import api from '../../lib/axios';
import { toast } from '../../stores/toastStore';

const lowlight = createLowlight(common);

const extensions = [
  StarterKit.configure({
    codeBlock: false,
    dropcursor: false,
  }),
  Underline,
  Markdown.configure({
    html: true,
    transformCopiedText: true,
    transformPastedText: true,
  }),
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
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  Dropcursor.configure({ color: '#3b82f6', width: 2 }),
  GlobalDragHandle.configure({
    dragHandleWidth: 20,
    scrollTreshold: 100,
  }),
  Callout,
];

export default function WikiEditor({ projectId, onToggleHistory }: { projectId: string; onToggleHistory?: () => void }) {
  const { activePage, updatePage, saveStatus, createVersion, editorVersion } = useWikiStore();
  const { tasks, fetchTasksByProject } = useTaskStore();
  const { files, fetchFileTree } = useEditorStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  const editor = useEditor({
    extensions,
    content: activePage?.content || '',
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-headings:font-bold prose-a:text-blue-400 max-w-none focus:outline-none min-h-[500px] leading-relaxed whitespace-pre-wrap',
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
      const response = await api.post(`/api/wiki/upload-image?projectId=${projectId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = response.data;
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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePage) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/api/wiki/upload-image?projectId=${projectId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = response.data;
      if (data.url) {
        updatePage(activePage.id, { coverImage: `http://localhost:3000${data.url}` });
      }
    } catch (err) {
      console.error('Cover upload failed', err);
      toast.error('Failed to upload cover image.');
    } finally {
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleGenerateSummary = async () => {
    if (!editor || !activePage) return;
    setIsGeneratingSummary(true);
    try {
      const content = editor.getText();
      const response = await api.post('/api/wiki/ai/summarize', { content, projectId });
      const summaryText = typeof response.data === 'string' ? response.data : response.data.summary || 'Failed to generate summary.';

      // Insert at the top of the document as a callout
      editor.commands.insertContentAt(0, `<div data-type="info" class="callout callout-info"><p><strong>✨ AI Summary</strong></p>${summaryText}</div><p></p>`);
    } catch (err) {
      console.error('Failed to generate summary', err);
      toast.error('Failed to generate AI Summary.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Editor Header / Toolbar */}
      <div className="h-14 border-b border-[#2d2d2d] flex items-center justify-between px-6 shrink-0 bg-[#252526] sticky top-0 z-20">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="truncate max-w-[200px] hover:text-gray-200 cursor-pointer">Workspace</span>
          <span className="text-gray-600">/</span>
          <span className="truncate max-w-[200px] text-gray-200">{activePage.title || 'Untitled'}</span>
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
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            className={`text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 px-3 py-1.5 rounded shadow-sm transition-all flex items-center gap-2 border border-purple-500/30 mr-2 ${isGeneratingSummary ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Generate AI Summary of this page"
          >
            ✨ {isGeneratingSummary ? 'Generating...' : 'AI Summary'}
          </button>
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

      {/* Bubble Menu */}
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex bg-[#252526] border border-[#333] rounded-md shadow-lg overflow-hidden">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon="B" className="font-bold" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon="I" className="italic" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon="U" className="underline" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon="S" className="line-through" />
          <div className="w-[1px] bg-[#333] my-1 mx-1"></div>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon="H2" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} icon="H3" />
          <div className="w-[1px] bg-[#333] my-1 mx-1"></div>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} icon="🖍️" />
        </BubbleMenu>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#1e1e1e] custom-scrollbar relative group/editor">
        {activePage.coverImage && (
          <div className="w-full h-48 sm:h-64 relative group/cover">
            <img src={activePage.coverImage} className="w-full h-full object-cover" alt="Cover" />
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/cover:opacity-100 transition-opacity">
              <button
                onClick={() => coverInputRef.current?.click()}
                className="bg-black/50 hover:bg-black/80 text-white px-3 py-1.5 rounded text-xs"
              >
                Change Cover
              </button>
              <button
                onClick={() => updatePage(activePage.id, { coverImage: null })}
                className="bg-black/50 hover:bg-black/80 text-white px-3 py-1.5 rounded text-xs"
              >
                Remove Cover
              </button>
            </div>
            <input
              type="file"
              ref={coverInputRef}
              onChange={handleCoverUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
        )}

        <div className="max-w-4xl mx-auto px-12 pt-12 pb-32">
          {/* Controls to add cover/icon if missing */}
          <div className="flex gap-4 opacity-0 group-hover/editor:opacity-100 transition-opacity mb-4">
            {!activePage.icon && (
              <button onClick={() => updatePage(activePage.id, { icon: '📄' })} className="text-gray-400 hover:text-gray-200 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Add Icon
              </button>
            )}
            {!activePage.coverImage && (
              <button onClick={() => updatePage(activePage.id, { coverImage: 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=2940&auto=format&fit=crop' })} className="text-gray-400 hover:text-gray-200 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Add Cover
              </button>
            )}
          </div>

          {/* Icon and Title */}
          <div className="flex flex-col mb-8 relative">
            {activePage.icon && (
              <div className="relative group/icon -mt-16 mb-4 z-10 w-max">
                <span
                  className="text-6xl cursor-pointer bg-[#1e1e1e] p-1 rounded inline-block hover:bg-[#252526] transition-colors"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Change Icon"
                >
                  {activePage.icon}
                </span>

                {showEmojiPicker && (
                  <div className="absolute top-full mt-2 left-0 z-50 shadow-2xl">
                    <EmojiPicker
                      theme={Theme.DARK}
                      onEmojiClick={(emojiData) => {
                        updatePage(activePage.id, { icon: emojiData.emoji });
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <input
              type="text"
              value={activePage.title}
              onChange={(e) => updatePage(activePage.id, { title: e.target.value })}
              className="bg-transparent text-4xl font-bold text-gray-100 outline-none w-full placeholder-gray-600 mb-4"
              placeholder="Untitled"
            />
          </div>

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
      className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${active ? 'bg-blue-600/20 text-blue-400 shadow-inner' : 'text-gray-400 hover:bg-[#333] hover:text-gray-100 hover:shadow-sm'
        } ${className}`}
    >
      {icon}
    </button>
  );
}
