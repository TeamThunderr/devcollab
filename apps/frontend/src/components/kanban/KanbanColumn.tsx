import React, { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { Task } from '../../types';
import { Plus, MoreHorizontal, MoveLeft, MoveRight, Edit2, Trash2, Kanban } from 'lucide-react';
import ConfirmDialog from '../common/ConfirmDialog';
import { SkeletonTaskCard } from '../common/Skeleton';
import EmptyState from '../common/EmptyState';

interface KanbanColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  config?: any;
  highlightedTaskIds?: Set<string>;
  isLoading?: boolean;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: string) => void;
  onRenameColumn?: (status: string, newTitle: string) => void;
  onDeleteColumn?: (status: string) => void;
  onMoveColumn?: (status: string, direction: 'left' | 'right') => void;
  isDraggable?: boolean;
}

const columnHeaderColors: Record<string, string> = {
  TODO: 'bg-slate-400 dark:bg-slate-600',
  IN_PROGRESS: 'bg-indigo-500',
  IN_REVIEW: 'bg-amber-500',
  DONE: 'bg-emerald-500',
};

export default function KanbanColumn({
  title,
  status,
  tasks,
  config,
  highlightedTaskIds,
  isLoading = false,
  onTaskClick,
  onAddTask,
  onRenameColumn,
  onDeleteColumn,
  onMoveColumn,
  isDraggable = true,
}: KanbanColumnProps): React.ReactElement {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
    disabled: !isDraggable,
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSaveRename() {
    if (editTitle.trim() && editTitle.trim() !== title && onRenameColumn) {
      onRenameColumn(status, editTitle.trim());
    }
    setIsEditing(false);
  }

  const badgeColor = columnHeaderColors[status] || 'bg-cyan-500';

  return (
    <section
      ref={setNodeRef}
      className={`min-w-[310px] w-[310px] flex-shrink-0 flex flex-col rounded-2xl border border-white/[0.04] bg-[#17191d] p-4 shadow-sm transition-all duration-200 relative ${
        isOver && isDraggable ? 'ring-1 ring-indigo-500/30 bg-[#1e2025] shadow-md scale-[1.01]' : ''
      }`}
    >
      {/* Column Header - Sticky */}
      <div className="sticky top-0 bg-[#17191d] z-10 pb-3 mb-4 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Status Indicator Dot */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${badgeColor} shadow-sm`}></span>

          {isEditing && isDraggable ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
              autoFocus
              className="w-full text-xs font-bold text-white bg-slate-950 border border-white/[0.04] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          ) : (
            <h2
              onDoubleClick={() => onRenameColumn && isDraggable && setIsEditing(true)}
              className={`text-xs font-extrabold uppercase tracking-wider text-slate-300 truncate transition ${
                isDraggable && onRenameColumn ? 'cursor-pointer hover:text-indigo-400' : 'cursor-default'
              }`}
              title={isDraggable && onRenameColumn ? 'Double click to rename' : undefined}
            >
              {title}
            </h2>
          )}
          <span className="flex-shrink-0 rounded bg-white/[0.03] text-slate-400 px-1.5 py-0.5 text-[9px] font-bold font-mono border border-white/[0.04]">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Quick Add Task */}
          {onAddTask && isDraggable && (
            <button
              type="button"
              onClick={() => onAddTask(status)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.02] transition"
              title="Create task in this column"
              aria-label="Add task to this column"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Column Actions Dropdown */}
          {isDraggable && (onRenameColumn || onMoveColumn || onDeleteColumn) && (
            <div ref={menuRef} className="relative flex items-center">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.02] transition"
                aria-label="Column options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/[0.04] bg-[#1e2025] py-1.5 shadow-2xl z-30 animate-in fade-in slide-in-from-top-1 duration-100 text-left">
                  {onRenameColumn && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.02] font-semibold"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-400" /> Rename Column
                    </button>
                  )}
                  {onMoveColumn && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onMoveColumn(status, 'left');
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.02] font-semibold"
                      >
                        <MoveLeft className="h-3.5 w-3.5 text-slate-400" /> Move Left
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onMoveColumn(status, 'right');
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.02] font-semibold"
                      >
                        <MoveRight className="h-3.5 w-3.5 text-slate-400" /> Move Right
                      </button>
                    </>
                  )}
                  {onDeleteColumn && !['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(status) && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/20 font-bold border-t border-white/[0.04] mt-1 pt-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Delete Column
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task Cards List */}
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5 mt-1">
          {/* Skeleton loading state */}
          {isLoading ? (
            <>
              <SkeletonTaskCard />
              <SkeletonTaskCard />
              <SkeletonTaskCard />
            </>
          ) : (
            <>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  config={config}
                  onClick={onTaskClick}
                  isHighlighted={highlightedTaskIds?.has(task.id)}
                  isDraggable={isDraggable}
                />
              ))}
              {tasks.length === 0 && (
                <EmptyState
                  icon={Kanban}
                  title="No tasks yet"
                  subtitle="Drag a task here or click + to create one"
                  className="py-8"
                />
              )}
            </>
          )}
        </div>
      </SortableContext>

      {/* Add task at bottom — only when tasks exist */}
      {!isLoading && tasks.length > 0 && onAddTask && isDraggable && (
        <button
          type="button"
          onClick={() => onAddTask(status)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-white/[0.02] border border-dashed border-white/[0.04] hover:border-white/[0.08] transition-all"
        >
          <Plus className="w-3 h-3" />
          Add task
        </button>
      )}

      {/* Confirm delete column dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title={`Delete "${title}"?`}
        message="All tasks in this column will remain on the board but lose their column assignment. This action cannot be undone."
        confirmLabel="Delete Column"
        onConfirm={() => {
          setConfirmDeleteOpen(false);
          onDeleteColumn?.(status);
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </section>
  );
}
