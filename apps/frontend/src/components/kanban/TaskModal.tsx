import React, { useEffect, useState, useRef } from 'react';
import { Comment, Task, TaskPriority, TaskStatus, User } from '../../types';
import { DatePicker } from '../ui/DatePicker';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';

interface TaskModalProps {
  task: Task;
  config: any;
  onUpdateMetadata: (taskId: string, category: 'assignees' | 'tags' | 'attachments' | 'checklists', data: any) => void;
  onClose: () => void;
  onSave: (updates: {
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    description?: string;
    title?: string;
    assigneeId?: string | null;
  }) => Promise<Task>;
  onDelete: (taskId: string) => Promise<void>;
  onAddComment: (taskId: string, content: string) => Promise<Comment>;
}

const parseLocalDate = (dateStr?: string): Date | undefined => {
  if (!dateStr) return undefined;
  const matches = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!matches) return new Date(dateStr);
  const [_, year, month, day] = matches;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
};

const formatLocalDateToUTCNoon = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T12:00:00.000Z`;
};

export default function TaskModal({
  task,
  config,
  onUpdateMetadata,
  onClose,
  onSave,
  onDelete,
  onAddComment,
}: TaskModalProps): React.ReactElement {
  const { members } = useWorkspaceStore();
  const { user: currentUser } = useAuthStore();

  const getMemberRole = (userId: string): string => {
    if (config?.ownerId === userId) return 'Owner';
    if (config?.projectRoles && config.projectRoles[userId]) {
      return config.projectRoles[userId];
    }
    
    // Default based on workspace role
    const wsMember = members.find(m => m.userId === userId);
    if (wsMember) {
      if (wsMember.role === 'OWNER') return 'Owner';
      if (wsMember.role === 'ADMIN') return 'Admin';
      if (wsMember.role === 'VIEWER') return 'Viewer';
    }
    return 'Developer';
  };

  const hasPermission = (userId: string, permissionKey: string): boolean => {
    const role = getMemberRole(userId);
    if (role === 'Owner') return true;

    if (config?.rolePermissions && config.rolePermissions[role]) {
      if (config.rolePermissions[role][permissionKey] !== undefined) {
        return !!config.rolePermissions[role][permissionKey];
      }
    }

    const defaultPermissions: Record<string, Record<string, boolean>> = {
      Admin: {
        create_task: true, edit_task: true, delete_task: true, move_task: true,
        manage_members: true, edit_project_settings: true, access_ai: true
      },
      'Project Manager': {
        create_task: true, edit_task: true, delete_task: true, move_task: true,
        manage_members: false, edit_project_settings: true, access_ai: true
      },
      Developer: {
        create_task: true, edit_task: true, delete_task: false, move_task: true,
        manage_members: false, edit_project_settings: false, access_ai: true
      },
      Viewer: {
        create_task: false, edit_task: false, delete_task: false, move_task: false,
        manage_members: false, edit_project_settings: false, access_ai: false
      }
    };

    return !!defaultPermissions[role]?.[permissionKey];
  };

  const isArchived = !!config?.archived;

  const canEdit = currentUser && !isArchived ? (task.id.startsWith('draft-') || hasPermission(currentUser.id, 'edit_task')) : false;
  const canDelete = currentUser && !isArchived ? hasPermission(currentUser.id, 'delete_task') : false;
  const canComment = currentUser && !isArchived && getMemberRole(currentUser.id) !== 'Viewer';

  const prevTaskIdRef = useRef<string | null>(null);
  const [draft, setDraft] = useState(task);
  const [commentText, setCommentText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Local Storage metadata states driven by config prop reactively
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [checklist, setChecklist] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Attachments state
  const [attachments, setAttachments] = useState<{ id: string; name: string; size: number; type?: string; data?: string; uploadedAt: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @ Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Drag & drop file state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Clicked mention user popover
  const [selectedMentionedUser, setSelectedMentionedUser] = useState<User | null>(null);
  const [mentionedUserRole, setMentionedUserRole] = useState<string>('');

  useEffect(() => {
    if (prevTaskIdRef.current === task.id) {
      return;
    }
    prevTaskIdRef.current = task.id;

    setDraft(task);
    
    if (task.id.startsWith('draft-')) {
      try {
        const stored = sessionStorage.getItem(`devcollab_draft_task_${task.projectId}_${task.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.task && parsed.task.id === task.id) {
            setDraft(parsed.task);
            setAssigneeId(parsed.task.assigneeId || '');
          }
          if (parsed && parsed.metadata) {
            setTags(parsed.metadata.tags || []);
            setAttachments(parsed.metadata.attachments || []);
            setChecklist(parsed.metadata.checklist || []);
          }
          return;
        }
      } catch (e) {
        console.error("Failed to restore draft metadata", e);
      }
    }

    // Reactively extract metadata from config prop
    const savedAssignee = task.assignee || config?.assignees?.[task.id];
    setAssigneeId(task.assigneeId || savedAssignee?.id || '');

    const savedTags = config?.tags?.[task.id] || [];
    setTags(savedTags);

    const savedAttachments = config?.attachments?.[task.id] || [];
    setAttachments(savedAttachments);

    const savedChecklist = config?.checklists?.[task.id] || [];
    setChecklist(savedChecklist);
  }, [task, config]);

  // Save local metadata changes back to parent
  const saveLocalMetadata = (updates: { assigneeId?: string; tags?: string[]; attachments?: any[]; checklist?: any[] }) => {
    if (task.id.startsWith('draft-')) {
      return;
    }
    try {
      const stored = localStorage.getItem(`devcollab_project_workspace_${task.projectId}`);
      if (stored) {
        const localConfig = JSON.parse(stored);
        
        // Handle Assignee
        if (updates.assigneeId !== undefined) {
          if (!localConfig.assignees) localConfig.assignees = {};
          if (updates.assigneeId) {
            const memberUser = members.find(m => m.userId === updates.assigneeId)?.user;
            if (memberUser) {
              localConfig.assignees[task.id] = memberUser;
              onUpdateMetadata(task.id, 'assignees', memberUser);
            }
          } else {
            delete localConfig.assignees[task.id];
            onUpdateMetadata(task.id, 'assignees', null);
          }
        }

        // Handle Tags
        if (updates.tags !== undefined) {
          if (!localConfig.tags) localConfig.tags = {};
          localConfig.tags[task.id] = updates.tags;
          onUpdateMetadata(task.id, 'tags', updates.tags);
        }

        // Handle Attachments
        if (updates.attachments !== undefined) {
          if (!localConfig.attachments) localConfig.attachments = {};
          localConfig.attachments[task.id] = updates.attachments;
          onUpdateMetadata(task.id, 'attachments', updates.attachments);
        }

        // Handle Checklist
        if (updates.checklist !== undefined) {
          if (!localConfig.checklists) localConfig.checklists = {};
          localConfig.checklists[task.id] = updates.checklist;
          onUpdateMetadata(task.id, 'checklists', updates.checklist);
        }
      }
    } catch (e) {
      // Ignore
    }
  };

  // Checklist helper handlers
  function handleAddChecklistItem() {
    if (!newChecklistItem.trim()) return;
    const newItem = {
      id: `chk-${Date.now()}-${Math.random()}`,
      text: newChecklistItem.trim(),
      completed: false
    };
    const nextChecklist = [...checklist, newItem];
    setChecklist(nextChecklist);
    saveLocalMetadata({ checklist: nextChecklist });
    setNewChecklistItem('');
  }

  function handleToggleChecklistItem(itemId: string) {
    const nextChecklist = checklist.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(nextChecklist);
    saveLocalMetadata({ checklist: nextChecklist });
  }

  function handleDeleteChecklistItem(itemId: string) {
    const nextChecklist = checklist.filter(item => item.id !== itemId);
    setChecklist(nextChecklist);
    saveLocalMetadata({ checklist: nextChecklist });
  }

  // Debounced Autosave for drafts
  useEffect(() => {
    if (!task.id.startsWith('draft-')) return;

    const handler = setTimeout(() => {
      try {
        const draftData = {
          task: {
            ...task,
            title: draft.title,
            description: draft.description,
            status: draft.status,
            priority: draft.priority,
            dueDate: draft.dueDate,
            assigneeId: assigneeId || null,
          },
          metadata: {
            tags,
            checklist,
            attachments,
          }
        };
        sessionStorage.setItem(`devcollab_draft_task_${task.projectId}_${task.id}`, JSON.stringify(draftData));
      } catch (e) {
        console.error("Failed to autosave draft", e);
      }
    }, 750);

    return () => {
      clearTimeout(handler);
    };
  }, [
    task.id,
    task.projectId,
    draft.title,
    draft.description,
    draft.status,
    draft.priority,
    draft.dueDate,
    assigneeId,
    tags,
    checklist,
    attachments
  ]);

  function handleDiscardDraft() {
    if (window.confirm('Discard this draft? All progress will be lost.')) {
      sessionStorage.removeItem(`devcollab_draft_task_${task.projectId}_${task.id}`);
      onClose();
    }
  }

  async function handleSave() {
    if (task.id.startsWith('draft-') && !draft.title.trim()) {
      alert('Task title is required.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await onSave({
        title: draft.title,
        description: draft.description,
        status: draft.status,
        priority: draft.priority,
        dueDate: draft.dueDate ?? null,
        assigneeId: assigneeId || null,
        tags: task.id.startsWith('draft-') ? tags : undefined,
        checklist: task.id.startsWith('draft-') ? checklist : undefined,
        attachments: task.id.startsWith('draft-') ? attachments : undefined,
      } as any);
      
      prevTaskIdRef.current = updated.id;
      setDraft(updated);
    } catch (err: any) {
      alert(`Failed to save task: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task?')) return;
    setIsDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    setIsPosting(true);
    try {
      const comment = await onAddComment(task.id, commentText.trim());
      setDraft((current) => ({
        ...current,
        comments: [comment, ...current.comments],
      }));

      // Parse for @mentions and trigger local notification
      const mentionedMatch = commentText.match(/@([a-zA-Z0-9\s]+)/g);
      if (mentionedMatch) {
        try {
          const stored = localStorage.getItem(`devcollab_project_workspace_${task.projectId}`);
          if (stored) {
            const config = JSON.parse(stored);
            if (!config.notifications) config.notifications = [];
            
            mentionedMatch.forEach((mention) => {
              const name = mention.substring(1).toLowerCase().trim();
              const matchedMember = members.find(m => (m.user?.name || '').toLowerCase().includes(name));
              if (matchedMember) {
                config.notifications.unshift({
                  id: `notif-${Date.now()}-${Math.random()}`,
                  message: `💬 ${currentUser?.name || 'Someone'} mentioned you in task: "${task.title}"`,
                  read: false,
                  timestamp: new Date().toISOString()
                });
              }
            });
            localStorage.setItem(`devcollab_project_workspace_${task.projectId}`, JSON.stringify(config));
          }
        } catch (e) {
          // Ignore
        }
      }

      setCommentText('');
    } finally {
      setIsPosting(false);
    }
  }

  // Tags updates handlers
  function handleAddTag() {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const nextTags = [...tags, newTag.trim()];
      setTags(nextTags);
      saveLocalMetadata({ tags: nextTags });
      setNewTag('');
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    const nextTags = tags.filter(t => t !== tagToRemove);
    setTags(nextTags);
    saveLocalMetadata({ tags: nextTags });
  }

  // Real Attachments handler using FileReader & Base64 encoding
  function uploadFile(file: File) {
    if (file.size > 1.5 * 1024 * 1024) {
      alert("To prevent exceeding browser localStorage limits, attachments must be under 1.5 MB.");
      return;
    }

    setUploadingName(file.name);
    setUploadProgress(10);

    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    reader.onload = () => {
      const base64Data = reader.result as string;
      const newAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        data: base64Data, // Save real Base64 data URI
        uploadedAt: new Date().toISOString()
      };
      const nextAttachments = [newAttachment, ...attachments];
      setAttachments(nextAttachments);
      saveLocalMetadata({ attachments: nextAttachments });
      setUploadProgress(null);
      setUploadingName('');
    };

    reader.onerror = () => {
      alert("Failed to read the file content.");
      setUploadProgress(null);
      setUploadingName('');
    };

    reader.readAsDataURL(file);
  }

  function handleSimulateUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) uploadFile(file);
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canEdit) setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (!canEdit) return;
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  function handleDeleteAttachment(attId: string) {
    const nextAttachments = attachments.filter(a => a.id !== attId);
    setAttachments(nextAttachments);
    saveLocalMetadata({ attachments: nextAttachments });
  }

  // Mentions autocomplete logic
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCommentText(text);

    const cursor = e.target.selectionStart;
    const lastAtPos = text.lastIndexOf('@', cursor - 1);
    if (lastAtPos !== -1 && lastAtPos < cursor) {
      const query = text.slice(lastAtPos + 1, cursor);
      if (!query.includes(' ') && !query.includes('\n')) {
        setMentionQuery(query);
        return;
      }
    }
    setMentionQuery(null);
  };

  const filteredMembers = React.useMemo(() => {
    if (mentionQuery === null) return [];
    return members
      .map(m => m.user)
      .filter(u => u.name && u.name.toLowerCase().includes(mentionQuery.toLowerCase()));
  }, [mentionQuery, members]);

  const selectMentionUser = (user: User) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const lastAtPos = commentText.lastIndexOf('@', cursor - 1);
    
    if (lastAtPos !== -1) {
      const before = commentText.slice(0, lastAtPos);
      const after = commentText.slice(cursor);
      const nextText = `${before}@${user.name || user.email} ` + after;
      setCommentText(nextText);
      setMentionQuery(null);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const nextCursorPos = lastAtPos + (user.name || '').length + 2;
          textareaRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
        }
      }, 50);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Task Details
            </span>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
              {draft.title || 'Untitled Task'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Scrollable Layout Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3">
          
          {/* Main content area */}
          <div className="col-span-2 p-6 space-y-6 border-r border-slate-100 dark:border-slate-800/80">
            
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Title
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  disabled={!canEdit}
                  className="w-full mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none transition focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Description
                <textarea
                  value={draft.description ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value || undefined,
                    }))
                  }
                  disabled={!canEdit}
                  rows={4}
                  placeholder="Describe this task details..."
                  className="w-full mt-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none transition focus:border-indigo-500 resize-none leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </label>
            </div>

            {/* Checklist Section */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">📋 Checklist ({checklist.length})</span>
                {checklist.length > 0 && (
                  <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                    {Math.round((checklist.filter(c => c.completed).length / checklist.length) * 100)}% Complete
                  </span>
                )}
              </span>

              {checklist.length > 0 && (
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-650 rounded-full transition-all duration-300"
                    style={{ width: `${(checklist.filter(c => c.completed).length / checklist.length) * 100}%` }}
                  ></div>
                </div>
              )}

              <div className="space-y-2 mt-2">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 hover:border-slate-200 dark:hover:border-slate-700 transition">
                    <label className="flex items-center gap-3 cursor-pointer select-none text-xs flex-1 text-left">
                      <input 
                        type="checkbox" 
                        checked={item.completed} 
                        disabled={!canEdit}
                        onChange={() => handleToggleChecklistItem(item.id)} 
                        className="rounded text-indigo-600 bg-white dark:bg-slate-900 border-slate-350 dark:border-slate-700 h-4.5 w-4.5 cursor-pointer focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                      <span className={`text-xs text-slate-700 dark:text-slate-200 font-semibold transition ${item.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                        {item.text}
                      </span>
                    </label>
                    {canEdit && (
                      <button 
                        type="button" 
                        onClick={() => handleDeleteChecklistItem(item.id)} 
                        className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition text-xs"
                        title="Remove checklist item"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {canEdit && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    placeholder="Add a checklist task..."
                    className="flex-1 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    disabled={!newChecklistItem.trim()}
                    className="px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-40 transition"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`space-y-3 pt-2 rounded-xl transition-all duration-200 ${
                isDraggingFile ? 'bg-indigo-500/10 border border-dashed border-indigo-500/30 p-3 scale-[1.01]' : 'border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  📎 Attachments ({attachments.length})
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline flex items-center gap-1"
                  >
                    ➕ Add File
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleSimulateUpload}
                  className="hidden"
                />
              </div>

              {uploadProgress !== null && (
                <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300 truncate max-w-[200px]">
                      Uploading: {uploadingName}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              {attachments.length === 0 && uploadProgress === null ? (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-600 bg-slate-50/20 dark:bg-slate-900/10">
                  No attachments yet. Select a file.
                </div>
              ) : (
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {attachments.map((file) => {
                    const isImage = file.type?.startsWith('image/') || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(file.name);
                    return (
                      <div key={file.id} className="flex items-center justify-between p-2.5 border border-slate-100 dark:border-slate-800/80 rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="min-w-0 flex items-center gap-2.5">
                          {isImage && file.data ? (
                            <img 
                              src={file.data} 
                              alt={file.name} 
                              className="w-9 h-9 rounded-lg object-cover border border-slate-250 dark:border-slate-800 bg-white" 
                            />
                          ) : (
                            <span className="text-xl w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg">📄</span>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2">
                          {file.data ? (
                            <a
                              href={file.data}
                              download={file.name}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 flex items-center justify-center"
                              title="Download"
                            >
                              ⬇️
                            </a>
                          ) : (
                            <a
                              href="#"
                              onClick={(e) => { e.preventDefault(); alert(`Simulated download for ${file.name}`); }}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 flex items-center justify-center"
                              title="Download"
                            >
                              ⬇️
                            </a>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(file.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 flex items-center justify-center"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comment Suite */}
            {task.id.startsWith('draft-') ? (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center py-6 text-xs text-slate-400 italic bg-slate-500/[0.01] rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                💬 Comments will be unlocked once this task is created.
              </div>
            ) : (
              <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  💬 Comments ({draft.comments?.length || 0})
                </span>

                <div className="space-y-3 relative">
                  <textarea
                    ref={textareaRef}
                    value={commentText}
                    onChange={handleCommentChange}
                    disabled={!canComment}
                    placeholder={canComment ? "Add context, review notes... type '@' to mention project members" : "You have read-only access and cannot post comments."}
                    rows={3}
                    className="w-full text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none transition focus:border-indigo-500 resize-none leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                  />

                  {mentionQuery !== null && filteredMembers.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-1.5 w-60 max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-40 py-1 animate-in slide-in-from-bottom-2 duration-100">
                      {filteredMembers.map((memberUser) => (
                        <button
                          key={memberUser.id}
                          type="button"
                          onClick={() => selectMentionUser(memberUser)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-left text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                        >
                          <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white">
                            {(memberUser.name || memberUser.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{memberUser.name || 'No Name'}</p>
                            <p className="text-[10px] text-slate-400 truncate">{memberUser.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      onClick={() => void handleAddComment()}
                      disabled={isPosting || !commentText.trim() || !canComment}
                      className="rounded-full bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                    >
                      {isPosting ? 'Posting...' : 'Add Comment'}
                    </button>
                  </div>
                </div>

                {/* Comments Thread */}
                <div className="space-y-3 mt-4">
                  {draft.comments?.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-100 dark:border-slate-800/80 rounded-xl bg-slate-50/10">
                      No comments yet.
                    </p>
                  ) : (
                    (draft.comments || []).map((comment) => {
                      const authorInitials = (comment.createdBy?.name || '?').charAt(0).toUpperCase();
                      const parts = comment.content.split(/(@[a-zA-Z0-9\s]+)/g);

                      return (
                        <article key={comment.id} className="flex gap-3 p-3.5 border border-slate-100 dark:border-slate-800/80 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 shadow-sm hover:shadow transition duration-150">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                            {authorInitials}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {comment.createdBy?.name || 'Workspace Member'}
                              </h4>
                              <span className="text-[10px] text-slate-400">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-left">
                              {parts.map((part, i) => {
                                if (part.startsWith('@')) {
                                    const mentionName = part.substring(1).trim();
                                    return (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                          const matched = members.find(m => 
                                            (m.user?.name || '').toLowerCase() === mentionName.toLowerCase() ||
                                            (m.user?.email || '').toLowerCase().includes(mentionName.toLowerCase())
                                          );
                                          if (matched && matched.user) {
                                            setSelectedMentionedUser(matched.user);
                                            setMentionedUserRole(matched.role);
                                          } else {
                                            const loose = members.find(m => (m.user?.name || '').toLowerCase().includes(mentionName.toLowerCase()));
                                            if (loose && loose.user) {
                                              setSelectedMentionedUser(loose.user);
                                              setMentionedUserRole(loose.role);
                                            }
                                          }
                                        }}
                                        className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-semibold px-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition inline-block text-left"
                                      >
                                        {part}
                                      </button>
                                    );
                                  }
                                  return part;
                                })}
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Right sidebar area (Metadata Controls) */}
            <div className="p-6 space-y-5 bg-slate-50/50 dark:bg-slate-900/20">
              
              <div className="space-y-4">
                
                {/* Status Selector */}
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                  <select
                    value={draft.status}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        status: event.target.value as TaskStatus,
                      }))
                    }
                    className="w-full mt-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none font-semibold transition focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="TODO" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-300">To Do</option>
                    <option value="IN_PROGRESS" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-300">In Progress</option>
                    <option value="IN_REVIEW" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-300">In Review</option>
                    <option value="DONE" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-300">Done</option>
                  </select>
                </label>

                {/* Priority Selector */}
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Priority
                  <select
                    value={draft.priority}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        priority: event.target.value as TaskPriority,
                      }))
                    }
                    className="w-full mt-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none font-semibold transition focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="P0" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-300">P0 (Critical)</option>
                    <option value="P1" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-300">P1 (High)</option>
                    <option value="P2" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-300">P2 (Normal)</option>
                  </select>
                </label>

                {/* Assignee Selector */}
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Assignee
                  <select
                    value={assigneeId}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssigneeId(val);
                      saveLocalMetadata({ assigneeId: val });
                      void onSave({ assigneeId: val || null }).catch((err) => {
                        alert(`Failed to update task assignee: ${err.message}`);
                      });
                    }}
                    className="w-full mt-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none font-semibold transition focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-300">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        👤 {m.user?.name || m.user?.email || 'Unnamed'} ({m.role})
                      </option>
                    ))}
                  </select>
                </label>



                {/* Due Date Selector */}
                <div className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Due date
                  <div className="mt-1.5">
                    <DatePicker
                      date={parseLocalDate(draft.dueDate)}
                      setDate={(date) =>
                        setDraft((current) => ({
                          ...current,
                          dueDate: date ? formatLocalDateToUTCNoon(date) : undefined,
                        }))
                      }
                      placeholder="Select a due date"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                {/* Custom Tags Section */}
                <div className="block text-xs font-semibold text-slate-500 uppercase tracking-wider space-y-2">
                  <span>Tags / Labels</span>
                  
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-2 rounded-xl">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-bold border border-indigo-100 dark:border-indigo-950/20"
                        >
                          {tag}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-indigo-900 text-[10px]"
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No tags added yet</p>
                  )}

                  {canEdit && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="tag..."
                        className="flex-1 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-slate-200 dark:text-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                {task.id.startsWith('draft-') ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={isSaving}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-3 text-xs font-bold transition shadow-md"
                    >
                      {isSaving ? 'Creating...' : '✨ Create Task'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDiscardDraft()}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-slate-650 dark:text-slate-400 hover:bg-slate-100/50 hover:text-white transition px-4 py-3 text-xs font-bold"
                    >
                      Discard Draft
                    </button>
                  </>
                ) : (
                  <>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-3 text-xs font-bold transition shadow-md"
                      >
                        {isSaving ? 'Saving...' : '💾 Save Changes'}
                      </button>
                    )}
                    
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void handleDelete()}
                        disabled={isDeleting}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/50 transition px-4 py-3 text-xs font-bold"
                      >
                        {isDeleting ? 'Deleting...' : '🗑️ Delete Task'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Floating profile overlay for clickable mentions */}
        {selectedMentionedUser && (
          <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <div className="w-80 bg-[#17191d] border border-white/[0.08] rounded-2xl p-5 text-white shadow-2xl text-left animate-in zoom-in-95 duration-150 relative">
              <button 
                type="button" 
                onClick={() => setSelectedMentionedUser(null)} 
                className="absolute top-3.5 right-4 text-slate-500 hover:text-white transition text-sm font-sans"
              >
                ✕
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-650 flex items-center justify-center font-bold text-lg text-white">
                  {(selectedMentionedUser.name || selectedMentionedUser.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">{selectedMentionedUser.name || 'Developer'}</h4>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{selectedMentionedUser.email}</p>
                  <span className="inline-block text-[9px] uppercase font-mono tracking-wider px-2 py-0.5 rounded border border-white/[0.04] bg-white/[0.02] text-indigo-400 mt-1.5 font-semibold">
                    {mentionedUserRole}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3.5 border-t border-white/[0.04] flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setSelectedMentionedUser(null)}
                  className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
