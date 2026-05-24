import React, { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { Task } from '../../types';
import { Plus, MoreHorizontal, MoveLeft, MoveRight, Edit2, Trash2 } from 'lucide-react';

interface KanbanColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: string) => void;
  onRenameColumn?: (status: string, newTitle: string) => void;
  onDeleteColumn?: (status: string) => void;
  onMoveColumn?: (status: string, direction: 'left' | 'right') => void;
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
  onTaskClick,
  onAddTask,
  onRenameColumn,
  onDeleteColumn,
  onMoveColumn,
}: KanbanColumnProps): React.ReactElement {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
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
      className={`min-w-[310px] w-[310px] flex-shrink-0 flex flex-col rounded-3xl border border-slate-205 dark:border-slate-850/80 bg-white/40 dark:bg-slate-900/10 p-4 shadow-sm backdrop-blur-md transition-all duration-300 h-full max-h-full relative overflow-hidden ${
        isOver ? 'ring-2 ring-indigo-500/30 bg-slate-100/50 dark:bg-slate-900/30 shadow-md scale-[1.01]' : ''
      }`}
    >
      {/* Column Header - Sticky */}
      <div className="sticky top-0 bg-transparent backdrop-blur-sm z-10 pb-3 mb-4 border-b border-slate-100/60 dark:border-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Status Indicator Dot */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${badgeColor} shadow-sm`}></span>

          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
              autoFocus
              className="w-full text-xs font-bold text-slate-850 dark:text-slate-200 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          ) : (
            <h2
              onDoubleClick={() => onRenameColumn && setIsEditing(true)}
              className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-250 truncate cursor-pointer hover:text-indigo-650 dark:hover:text-indigo-400 transition"
              title="Double click to rename"
            >
              {title}
            </h2>
          )}
          <span className="flex-shrink-0 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2 py-0.5 text-[10px] font-extrabold font-mono border border-slate-205 dark:border-slate-850">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Quick Add Task */}
          {onAddTask && (
            <button
              type="button"
              onClick={() => onAddTask(status)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
              title="Create task in this column"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Column Actions Dropdown */}
          <div ref={menuRef} className="relative flex items-center">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-1.5 shadow-2xl z-30 animate-in fade-in slide-in-from-top-1 duration-100 text-left">
                {onRenameColumn && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold"
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
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold"
                    >
                      <MoveLeft className="h-3.5 w-3.5 text-slate-400" /> Move Left
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onMoveColumn(status, 'right');
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold"
                    >
                      <MoveRight className="h-3.5 w-3.5 text-slate-400" /> Move Right
                    </button>
                  </>
                )}
                {onDeleteColumn && !['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(status) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete the column "${title}"?`)) {
                        onDeleteColumn(status);
                      }
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold border-t border-slate-100 dark:border-slate-900 mt-1 pt-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Delete Column
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Cards List - Custom Scrollbar */}
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-3 min-h-[220px] premium-scrollbar">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-205 dark:border-slate-800/80 px-4 py-10 text-center text-xs text-slate-400 bg-white/30 dark:bg-slate-950/10 min-h-[140px] transition-all relative overflow-hidden group">
              <span className="text-2xl mb-1.5 grayscale opacity-70 group-hover:grayscale-0 group-hover:scale-115 transition-all duration-300">📥</span>
              <p className="font-extrabold text-[11px] text-slate-500 dark:text-slate-400">Empty Stage</p>
              <p className="text-[9px] text-slate-400/80 mt-0.5 max-w-[150px] leading-relaxed">No deliverables allocated. Drag a card or click + to add.</p>
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}
