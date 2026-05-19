import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { Task, TaskStatus } from '../../types';

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const columnTone: Record<TaskStatus, string> = {
  TODO: 'from-slate-200 to-slate-100',
  IN_PROGRESS: 'from-cyan-200 to-sky-100',
  IN_REVIEW: 'from-amber-200 to-orange-100',
  DONE: 'from-emerald-200 to-lime-100',
};

export default function KanbanColumn({
  title,
  status,
  tasks,
  onTaskClick,
}: KanbanColumnProps): React.ReactElement {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

  return (
    <section
      ref={setNodeRef}
      className={`min-w-[280px] flex-1 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm transition ${
        isOver ? 'ring-2 ring-cyan-300' : ''
      }`}
    >
      <div className={`rounded-2xl bg-gradient-to-r p-4 ${columnTone[status]}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Kanban</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-slate-700">
            {tasks.length}
          </span>
        </div>
      </div>

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">
              Drop a task here
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}
