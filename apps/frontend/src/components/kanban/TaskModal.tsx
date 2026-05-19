import React, { useEffect, useState } from 'react';
import { Comment, Task, TaskPriority, TaskStatus } from '../../types';
import { DatePicker } from '../ui/DatePicker';

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
  const [draft, setDraft] = useState(task);
  const [commentText, setCommentText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    setDraft(task);
  }, [task]);

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
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task?')) {
      return;
    }

    setIsDeleting(true);

    try {
      await onDelete(task.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAddComment() {
    if (!commentText.trim()) {
      return;
    }

    setIsPosting(true);

    try {
      const comment = await onAddComment(task.id, commentText.trim());
      setDraft((current) => ({
        ...current,
        comments: [comment, ...current.comments],
      }));
      setCommentText('');
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-600">Task Detail</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">{task.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Title
            <input
              type="text"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Due date
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
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Status
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as TaskStatus,
                }))
              }
              className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Priority
            <select
              value={draft.priority}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  priority: event.target.value as TaskPriority,
                }))
              }
              className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
            >
              <option value="P0">P0</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
            </select>
          </label>
        </div>

        <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
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
            className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
          />
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? 'Deleting...' : 'Delete Task'}
          </button>
        </div>

        <section className="mt-8 rounded-3xl bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-slate-900">Comments</h3>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              {draft.comments.length}
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Add context, review notes, or blockers..."
              rows={3}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500"
            />
            <div>
              <button
                type="button"
                onClick={() => void handleAddComment()}
                disabled={isPosting || !commentText.trim()}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPosting ? 'Posting...' : 'Add Comment'}
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {draft.comments.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                No comments yet.
              </p>
            ) : (
              draft.comments.map((comment) => (
                <article key={comment.id} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm leading-6 text-slate-700">{comment.content}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
