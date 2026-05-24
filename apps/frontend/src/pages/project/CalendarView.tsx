import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, startOfDay, endOfDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { Task } from '../../types';
import { cn } from '../../lib/utils';

export default function CalendarView(): React.ReactElement {
  const { workspaceId, projectId: pid } = useParams<{ workspaceId: string; projectId: string }>();
  const { tasks, loading, error, fetchTasksByProject } = useTaskStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tasksForDate, setTasksForDate] = useState<Task[]>([]);

  useEffect(() => {
    if (pid) {
      void fetchTasksByProject(pid);
    }
  }, [fetchTasksByProject, pid]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    setTasksForDate(
      tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return taskDate >= dayStart && taskDate <= dayEnd;
      })
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
    setSelectedDate(null);
    setTasksForDate([]);
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
    setSelectedDate(null);
    setTasksForDate([]);
  };

  const getTasksForDay = (date: Date): Task[] => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return taskDate >= dayStart && taskDate <= dayEnd;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'P1':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'P2':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'bg-slate-50 border-l-2 border-slate-400';
      case 'IN_PROGRESS':
        return 'bg-cyan-50 border-l-2 border-cyan-500';
      case 'IN_REVIEW':
        return 'bg-purple-50 border-l-2 border-purple-500';
      case 'DONE':
        return 'bg-emerald-50 border-l-2 border-emerald-500';
      default:
        return 'bg-slate-50';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-800 p-8 text-white shadow-xl sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to={`/w/${workspaceId}/projects`} className="text-sm uppercase tracking-widest text-cyan-200 hover:text-white transition">
              ← Back to Projects
            </Link>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Calendar View</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200">
              Visualize your project tasks on a calendar based on due dates.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Calendar */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg hover:bg-slate-100 transition"
              >
                <ChevronLeft className="h-6 w-6 text-slate-600" />
              </button>
              <h2 className="text-2xl font-semibold text-slate-900">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg hover:bg-slate-100 transition"
              >
                <ChevronRight className="h-6 w-6 text-slate-600" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="h-12 flex items-center justify-center text-sm font-semibold text-slate-600">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {days.map(day => {
                const dayTasks = getTasksForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);
                const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');

                return (
                  <div
                    key={format(day, 'yyyy-MM-dd')}
                    onClick={() => handleSelectDate(day)}
                    className={cn(
                      'min-h-24 p-2 rounded-lg border-2 transition cursor-pointer',
                      !isCurrentMonth && 'bg-slate-50 border-slate-100 text-slate-400',
                      isCurrentMonth && 'border-slate-200 hover:border-cyan-300 hover:bg-slate-50',
                      isTodayDate && 'border-cyan-500 bg-cyan-50',
                      isSelected && 'border-cyan-600 bg-cyan-100'
                    )}
                  >
                    <div className={cn(
                      'text-sm font-semibold mb-1',
                      !isCurrentMonth && 'text-slate-400',
                      isCurrentMonth && 'text-slate-900',
                      isTodayDate && 'text-cyan-600'
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded border truncate font-medium',
                            getStatusColor(task.status)
                          )}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-xs text-slate-500 px-1.5">
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar - Selected Date Tasks */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {selectedDate ? format(selectedDate, 'PPP') : 'Select a Date'}
            </h3>
            
            {loading ? (
              <div className="text-sm text-slate-500">Loading tasks...</div>
            ) : selectedDate && tasksForDate.length > 0 ? (
              <div className="space-y-3">
                {tasksForDate.map(task => (
                  <div
                    key={task.id}
                    className={cn('p-3 rounded-lg border', getStatusColor(task.status))}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm text-slate-900 flex-1">{task.title}</h4>
                      <span className={cn('text-xs font-semibold px-2 py-1 rounded border', getPriorityColor(task.priority))}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 uppercase font-semibold">{task.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedDate ? (
              <div className="text-sm text-slate-500 text-center py-8">
                No tasks scheduled for this date.
              </div>
            ) : (
              <div className="text-sm text-slate-500 text-center py-8">
                Click on a date to view tasks.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
