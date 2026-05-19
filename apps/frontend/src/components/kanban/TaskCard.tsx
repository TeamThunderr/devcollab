import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

const priorityTone: Record<Task['priority'], string> = {
  P0: 'bg-rose-100 text-rose-700',
  P1: 'bg-amber-100 text-amber-800',
  P2: 'bg-emerald-100 text-emerald-800',
};

export default function TaskCard({ task, onClick }: TaskCardProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
      status: task.status,
    },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onClick?.(task)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-cyan-300 hover:shadow-md ${
        isDragging ? 'opacity-60 shadow-xl' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{task.title}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Created {new Date(task.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityTone[task.priority]}`}>
          {task.priority}
        </span>
      </div>

      {task.description ? (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{task.description}</p>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>{task.comments.length} comments</span>
        <div className="flex items-center gap-1">
          {task.dueDate ? (
            <span
              className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                task.status === 'DONE'
                  ? 'border-slate-200 bg-slate-50 text-slate-400'
                  : new Date(task.dueDate) < new Date()
                  ? 'border-rose-200 bg-rose-50 text-rose-600'
                  : new Date(task.dueDate).getTime() - new Date().getTime() < 48 * 60 * 60 * 1000
                  ? 'border-amber-200 bg-amber-50 text-amber-600'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              📅 {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          ) : (
            <span className="text-slate-400">No due date</span>
          )}
        </div>
      </div>
    </button>
  );
}
