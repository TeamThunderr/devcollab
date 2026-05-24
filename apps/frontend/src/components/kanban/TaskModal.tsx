import React, { useEffect, useState, useRef } from 'react';
import { Comment, Task, TaskPriority, TaskStatus, User } from '../../types';
import { DatePicker } from '../ui/DatePicker';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  onSave: (updates: {
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
    description?: string;
    title?: string;
  }) => Promise<Task>;
  onDelete: (taskId: string) => Promise<void>;
  onAddComment: (taskId: string, content: string) => Promise<Comment>;
}

export default function TaskModal({
  task,
  onClose,
  onSave,
  onDelete,
  onAddComment,
}: TaskModalProps): React.ReactElement {
  const { members } = useWorkspaceStore();
  const { user: currentUser } = useAuthStore();

  const [draft, setDraft] = useState(task);
  const [commentText, setCommentText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Local Storage metadata states
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [sprintId, setSprintId] = useState<string>('');
  const [checklist, setChecklist] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Attachments state
  const [attachments, setAttachments] = useState<{ id: string; name: string; size: number; uploadedAt: string }[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingName, setUploadingName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @ Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load project configuration from localStorage
  const loadLocalMetadata = () => {
    try {
      const stored = localStorage.getItem(`devcollab_project_workspace_${task.projectId}`);
      if (stored) {
        const config = JSON.parse(stored);
        const savedAssignee = config.assignees?.[task.id];
        if (savedAssignee) setAssigneeId(savedAssignee.id);

        const savedTags = config.tags?.[task.id] || [];
        setTags(savedTags);

        const savedAttachments = config.attachments?.[task.id] || [];
        setAttachments(savedAttachments);

        const activeSprint = config.sprints?.find((s: any) => s.taskIds?.includes(task.id));
        if (activeSprint) setSprintId(activeSprint.id);

        const savedChecklist = config.checklists?.[task.id] || [];
        setChecklist(savedChecklist);
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    setDraft(task);
    loadLocalMetadata();
  }, [task]);

  // Save local metadata changes back to localStorage
  const saveLocalMetadata = (updates: { assigneeId?: string; tags?: string[]; attachments?: any[]; sprintId?: string; checklist?: any[] }) => {
    try {
      const stored = localStorage.getItem(`devcollab_project_workspace_${task.projectId}`);
      if (stored) {
        const config = JSON.parse(stored);
        
        // Handle Assignee
        if (updates.assigneeId !== undefined) {
          if (!config.assignees) config.assignees = {};
          if (updates.assigneeId) {
            const memberUser = members.find(m => m.userId === updates.assigneeId)?.user;
            if (memberUser) {
              config.assignees[task.id] = memberUser;
            }
          } else {
            delete config.assignees[task.id];
          }
        }

        // Handle Tags
        if (updates.tags !== undefined) {
          if (!config.tags) config.tags = {};
          config.tags[task.id] = updates.tags;
        }

        // Handle Attachments
        if (updates.attachments !== undefined) {
          if (!config.attachments) config.attachments = {};
          config.attachments[task.id] = updates.attachments;
        }

        // Handle Checklist
        if (updates.checklist !== undefined) {
          if (!config.checklists) config.checklists = {};
          config.checklists[task.id] = updates.checklist;
        }

        // Handle Sprint
        if (updates.sprintId !== undefined) {
          if (!config.sprints) config.sprints = [];
          // Remove from previous sprint
          config.sprints = config.sprints.map((s: any) => ({
            ...s,
            taskIds: (s.taskIds || []).filter((id: string) => id !== task.id)
          }));
          // Add to new sprint
          if (updates.sprintId) {
            config.sprints = config.sprints.map((s: any) => {
              if (s.id === updates.sprintId) {
                return { ...s, taskIds: [...(s.taskIds || []), task.id] };
              }
              return s;
            });
          }
        }

        // Log an activity for metadata updates
        if (!config.activities) config.activities = [];
        let activityMsg = '';
        if (updates.assigneeId !== undefined) activityMsg = `updated assignee for "${task.title}"`;
        if (updates.tags !== undefined) activityMsg = `updated tags for "${task.title}"`;
        if (updates.attachments !== undefined) activityMsg = `modified attachments for "${task.title}"`;
        if (updates.checklist !== undefined) activityMsg = `modified checklist for "${task.title}"`;
        if (updates.sprintId !== undefined) activityMsg = `moved "${task.title}" to a sprint`;

        if (activityMsg) {
          config.activities.unshift({
            id: `act-${Date.now()}`,
            userId: currentUser?.id || 'unknown',
            userName: currentUser?.name || 'Workspace Member',
            action: 'task_update',
            details: activityMsg,
            timestamp: new Date().toISOString()
          });
        }

        localStorage.setItem(`devcollab_project_workspace_${task.projectId}`, JSON.stringify(config));
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

  async function handleSave() {
    setIsSaving(true);
    try {
      const updated = await onSave({
        title: draft.title,
        description: draft.description,
        status: draft.status,
        priority: draft.priority,
        dueDate: draft.dueDate ?? null,
      });
      setDraft(updated);
      loadLocalMetadata();
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

  // Simulated Attachments handler
  function handleSimulateUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingName(file.name);
    setUploadProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          const newAttachment = {
            id: `att-${Date.now()}`,
            name: file.name,
            size: file.size,
            uploadedAt: new Date().toISOString()
          };
          const nextAttachments = [newAttachment, ...attachments];
          setAttachments(nextAttachments);
          saveLocalMetadata({ attachments: nextAttachments });
          setUploadProgress(null);
          setUploadingName('');
        }, 300);
      }
    }, 150);
  }

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

  const activeSprintList = React.useMemo(() => {
    try {
      const stored = localStorage.getItem(`devcollab_project_workspace_${task.projectId}`);
      if (stored) {
        return JSON.parse(stored).sprints || [];
      }
    } catch {}
    return [];
  }, [task.projectId]);

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
                  className="w-full mt-1.5 text-base font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none transition focus:border-indigo-500"
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
                  rows={4}
                  placeholder="Describe this task details..."
                  className="w-full mt-1.5 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none transition focus:border-indigo-500 resize-none leading-relaxed"
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
                        onChange={() => handleToggleChecklistItem(item.id)} 
                        className="rounded text-indigo-600 bg-white dark:bg-slate-900 border-slate-350 dark:border-slate-700 h-4.5 w-4.5 cursor-pointer focus:ring-indigo-500" 
                      />
                      <span className={`text-slate-700 dark:text-slate-200 font-semibold transition ${item.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                        {item.text}
                      </span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteChecklistItem(item.id)} 
                      className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition text-xs"
                      title="Remove checklist item"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

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
            </div>

            {/* Attachments Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  📎 Attachments ({attachments.length})
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline flex items-center gap-1"
                >
                  ➕ Add File
                </button>
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
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2.5 border border-slate-100 dark:border-slate-800/80 rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-xl">📄</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); alert(`Downloading simulated file: ${file.name}`); }}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                          title="Download"
                        >
                          ⬇️
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(file.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment Suite */}
            <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                💬 Comments ({draft.comments?.length || 0})
              </span>

              <div className="space-y-3 relative">
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={handleCommentChange}
                  placeholder="Add context, review notes... type '@' to mention project members"
                  rows={3}
                  className="w-full text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none transition focus:border-indigo-500 resize-none leading-relaxed"
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
                    disabled={isPosting || !commentText.trim()}
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
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {parts.map((part, i) => {
                              if (part.startsWith('@')) {
                                return (
                                  <span key={i} className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-semibold px-1 rounded inline-block">
                                    {part}
                                  </span>
                                );
                              }
                              return part;
                            })}
                          </p>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Right sidebar area (Metadata Controls) */}
          <div className="p-6 space-y-5 bg-slate-50/50 dark:bg-slate-900/20">
            
            <div className="space-y-4">
              
              {/* Status Selector */}
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as TaskStatus,
                    }))
                  }
                  className="w-full mt-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none font-semibold transition focus:border-indigo-500"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </label>

              {/* Priority Selector */}
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Priority
                <select
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      priority: event.target.value as TaskPriority,
                    }))
                  }
                  className="w-full mt-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none font-semibold transition focus:border-indigo-500"
                >
                  <option value="P0">P0 (Critical)</option>
                  <option value="P1">P1 (High)</option>
                  <option value="P2">P2 (Normal)</option>
                </select>
              </label>

              {/* Assignee Selector */}
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assignee
                <select
                  value={assigneeId}
                  onChange={(e) => {
                    setAssigneeId(e.target.value);
                    saveLocalMetadata({ assigneeId: e.target.value });
                  }}
                  className="w-full mt-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none font-semibold transition focus:border-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      👤 {m.user?.name || m.user?.email || 'Unnamed'} ({m.role})
                    </option>
                  ))}
                </select>
              </label>

              {/* Sprint Selector */}
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Sprint
                <select
                  value={sprintId}
                  onChange={(e) => {
                    setSprintId(e.target.value);
                    saveLocalMetadata({ sprintId: e.target.value });
                  }}
                  className="w-full mt-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none font-semibold transition focus:border-indigo-500"
                >
                  <option value="">No Sprint (Backlog)</option>
                  {activeSprintList.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      🏃 {s.name} ({s.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </label>

              {/* Due Date Selector */}
              <div className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Due date
                <div className="mt-1.5">
                  <DatePicker
                    date={draft.dueDate ? new Date(draft.dueDate) : undefined}
                    setDate={(date) =>
                      setDraft((current) => ({
                        ...current,
                        dueDate: date ? date.toISOString() : undefined,
                      }))
                    }
                    placeholder="Select a due date"
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
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-indigo-900 text-[10px]"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">No tags added yet</p>
                )}

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
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-3 text-xs font-bold transition shadow-md"
              >
                {isSaving ? 'Saving...' : '💾 Save Changes'}
              </button>
              
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/50 transition px-4 py-3 text-xs font-bold"
              >
                {isDeleting ? 'Deleting...' : '🗑️ Delete Task'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

