import React, { useState } from 'react';
import { Task } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CalendarViewProps {
  tasks: Task[];
  config: any;
  onUpdateMetadata: (taskId: string, category: 'assignees' | 'tags' | 'attachments' | 'checklists', data: any) => void;
  onTaskClick: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: any) => Promise<any>;
  onDayClick: (date: Date) => void;
}

const formatLocalDateToUTCNoon = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T12:00:00.000Z`;
};

const priorityConfig: Record<Task['priority'], { dot: string }> = {
  P0: { dot: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]' },
  P1: { dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]' },
  P2: { dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' },
};

const statusBorder: Record<Task['status'], string> = {
  TODO: 'border-l-[3px] border-slate-500/40 bg-slate-500/[0.04]',
  IN_PROGRESS: 'border-l-[3px] border-cyan-500/50 bg-cyan-500/[0.04]',
  IN_REVIEW: 'border-l-[3px] border-purple-500/50 bg-purple-500/[0.04]',
  DONE: 'border-l-[3px] border-emerald-500/50 bg-emerald-500/[0.04]',
};

export default function CalendarView({
  tasks,
  config: _config,
  onUpdateMetadata: _onUpdateMetadata,
  onTaskClick,
  onUpdateTask,
  onDayClick
}: CalendarViewProps): React.ReactElement {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Month intervals calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  // Timezone-proof day filtering using strict prefix comparison
  const getTasksForDay = (date: Date): Task[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      return task.dueDate.substring(0, 10) === dateStr;
    });
  };

  // Rescheduling Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      // Optimistically update locally using the timezone-proof YYYY-MM-DD noon format
      const formattedDate = formatLocalDateToUTCNoon(targetDate);
      await onUpdateTask(taskId, { dueDate: formattedDate });
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.04] bg-[#17191d] p-6 shadow-sm space-y-6 text-left select-none">
      {/* Month Navigation Panel */}
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4.5 w-4.5 text-indigo-400" />
          <h2 className="text-base font-extrabold text-white tracking-tight">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>
        
        <div className="flex items-center gap-1.5 bg-black/20 border border-white/[0.04] rounded-lg p-0.5">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-white/[0.03] transition text-slate-400 hover:text-white"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2 py-0.5 text-[9px] font-extrabold uppercase text-slate-400 hover:text-white hover:bg-white/[0.03] rounded transition"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-white/[0.03] transition text-slate-400 hover:text-white"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid of Days */}
      <div>
        {/* Day Headers (Sun-Sat) */}
        <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map(day => {
            const dayTasks = getTasksForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const dateStr = format(day, 'yyyy-MM-dd');
            const isDraggingOver = dragOverDate === dateStr;

            return (
              <div
                key={dateStr}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => void handleDrop(e, day)}
                className={cn(
                  'min-h-[105px] p-2.5 rounded-xl border transition-all duration-150 relative group/cell flex flex-col justify-between',
                  !isCurrentMonth && 'bg-[#121316]/20 border-white/[0.01] text-slate-650 pointer-events-none opacity-40',
                  isCurrentMonth && 'bg-[#121316]/50 border-white/[0.03] hover:border-indigo-500/20 hover:bg-[#1a1c22]',
                  isTodayDate && 'border-indigo-500/40 bg-indigo-500/[0.02]',
                  isDraggingOver && 'border-dashed border-indigo-500/50 bg-indigo-500/10 scale-[1.01]'
                )}
              >
                {/* Header of Cell (Day Number + Hover Plus Indicator) */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-[11px] font-extrabold',
                    !isCurrentMonth && 'text-slate-650',
                    isCurrentMonth && 'text-slate-400',
                    isTodayDate && 'text-indigo-400 font-black'
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {isCurrentMonth && (
                    <button
                      type="button"
                      onClick={() => onDayClick(day)}
                      className="opacity-0 group-hover/cell:opacity-100 p-0.5 rounded border border-white/[0.04] bg-[#0c0d10] text-slate-400 hover:text-white transition"
                      title="Add task on this date"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Day Tasks Pills Container */}
                <div className="space-y-1.5 mt-2 flex-1 flex flex-col justify-start">
                  {dayTasks.slice(0, 3).map(task => {
                    const prio = priorityConfig[task.priority] || priorityConfig.P2;
                    return (
                      <div
                        key={task.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => onTaskClick(task)}
                        className={cn(
                          'text-[9px] px-2 py-1 rounded-md border border-white/[0.03] font-bold text-slate-200 cursor-grab active:cursor-grabbing truncate flex items-center gap-1.5 select-none hover:text-indigo-300 hover:border-indigo-500/10 transition',
                          statusBorder[task.status]
                        )}
                        title={`${task.title} (${task.status.replace('_', ' ')})`}
                      >
                        <span className={cn('w-1 h-1 rounded-full flex-shrink-0', prio.dot)}></span>
                        <span className="truncate">{task.title}</span>
                      </div>
                    );
                  })}
                  
                  {dayTasks.length > 3 && (
                    <div className="text-[8px] text-slate-500 font-extrabold px-1 text-center">
                      +{dayTasks.length - 3} more tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
