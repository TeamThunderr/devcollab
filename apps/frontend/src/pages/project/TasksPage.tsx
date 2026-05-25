import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { useTaskStore } from '../../stores/taskStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';
import KanbanColumn from '../../components/kanban/KanbanColumn';
import TaskModal from '../../components/kanban/TaskModal';
import { DatePicker } from '../../components/ui/DatePicker';
import { Task, TaskStatus, TaskPriority } from '../../types';

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'IN_REVIEW', title: 'In Review' },
  { id: 'DONE', title: 'Done' },
];

function isTaskStatus(value: string): value is TaskStatus {
  return COLUMNS.some((column) => column.id === value);
}

export default function TasksPage(): React.ReactElement {
  const { workspaceId, projectId: pid } = useParams<{ workspaceId: string; projectId: string }>();
  const { tasks, loading, error, fetchTasksByProject, createTask, updateTask, deleteTask, addComment } = useTaskStore();
  const { members } = useWorkspaceStore();
  const { user } = useAuthStore();
  
  const currentUserMember = members.find((m) => m.userId === user?.id);
  const userRole = currentUserMember?.role || 'VIEWER';
  const canEditTasks = userRole !== 'VIEWER';

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('P1');
  const [dueDate, setDueDate] = useState<Date | undefined>();

  useEffect(() => {
    if (pid) {
      void fetchTasksByProject(pid);
    }
  }, [fetchTasksByProject, pid]);

  function handleDragEnd(event: DragEndEvent) {
    if (!canEditTasks) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const activeTask = tasks.find((task) => task.id === activeId);
    if (!activeTask) return;

    const overId = String(over.id);
    const overTask = tasks.find((task) => task.id === overId);
    const overStatus = String(over.data.current?.status);
    const nextStatus: TaskStatus | null = isTaskStatus(overId)
      ? overId
      : overTask?.status ?? (isTaskStatus(overStatus) ? overStatus : null);

    if (nextStatus && activeTask.status !== nextStatus) {
      void updateTask(activeId, { status: nextStatus });
    }
  }

  async function handleCreateTask() {
    if (!title.trim() || !pid) return;

    await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      projectId: pid
    });

    // Only clear the title and description, preserve status, priority, and due date
    setTitle('');
    setDescription('');
    // Keep status, priority, and dueDate for next task creation
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-800 p-8 text-white shadow-xl sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to={`/${workspaceId}/projects`} className="text-sm uppercase tracking-widest text-cyan-200 hover:text-white transition">
              ← Back to Projects
            </Link>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Project Tasks</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200">
              Manage tasks for this project across the delivery pipeline.
            </p>
          </div>
          {canEditTasks && (
            <button
              type="button"
              onClick={() => setShowForm(current => !current)}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-100"
            >
              {showForm ? 'Close Form' : 'New Task'}
            </button>
          )}
        </div>

        {showForm && canEditTasks ? (
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Create Task</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Title
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Task title..."
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Status
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as TaskStatus)}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Description
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Task details..."
                  rows={3}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Priority
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as TaskPriority)}
                  className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500"
                >
                  <option value="P0">P0 (Critical)</option>
                  <option value="P1">P1 (High)</option>
                  <option value="P2">P2 (Normal)</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Due Date
                <DatePicker date={dueDate} setDate={setDueDate} placeholder="Select a due date" disablePastDates={true} />
              </label>
              <div className="flex items-end gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={() => void handleCreateTask()}
                  disabled={!title.trim()}
                  className="rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Loading tasks...
          </div>
        ) : (
          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-6 overflow-x-auto pb-4">
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  title={col.title}
                  status={col.id}
                  tasks={tasks.filter(t => t.status === col.id)}
                  onTaskClick={setSelectedTask}
                />
              ))}
            </div>
          </DndContext>
        )}
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={(updates) => updateTask(selectedTask.id, { ...updates, dueDate: updates.dueDate === null ? undefined : updates.dueDate })}
          onDelete={(id) => deleteTask(id)}
          onAddComment={(id, content) => addComment(id, content)}
        />
      )}
    </div>
  );
}
