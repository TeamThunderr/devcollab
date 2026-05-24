import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import { MessageSquare, Paperclip, Calendar, CheckSquare } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

const priorityConfig: Record<Task['priority'], { label: string; text: string; bg: string; dot: string }> = {
  P0: { label: 'Critical', text: 'text-rose-700 dark:text-rose-455', bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30', dot: 'bg-rose-500' },
  P1: { label: 'High', text: 'text-amber-700 dark:text-amber-455', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30', dot: 'bg-amber-500' },
  P2: { label: 'Normal', text: 'text-emerald-700 dark:text-emerald-455', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30', dot: 'bg-emerald-500' },
};

const tagColors = [
  'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-105/50 dark:border-blue-950/40',
  'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-105/50 dark:border-purple-950/40',
  'bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 border-teal-105/50 dark:border-teal-950/40',
  'bg-pink-50 dark:bg-pink-950/20 text-pink-700 dark:text-pink-400 border-pink-105/50 dark:border-pink-950/40',
];

export default function TaskCard({ task, onClick }: TaskCardProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
      status: task.status,
    },
  });

  // Load local storage extensions for checklists, assignees, sprints, comments
  const localProjectData = React.useMemo(() => {
    try {
      const stored = localStorage.getItem(`devcollab_project_workspace_${task.projectId}`);
      if (stored) {
        const config = JSON.parse(stored);
        const taskAssignee = config.assignees?.[task.id];
        const taskTags = config.tags?.[task.id] || [];
        const taskAttachments = config.attachments?.[task.id] || [];
        const savedChecklist = config.checklists?.[task.id] || [];
        const sprint = config.sprints?.find((s: any) => s.taskIds?.includes(task.id));
        return { assignee: taskAssignee, tags: taskTags, attachments: taskAttachments, checklist: savedChecklist, sprint };
      }
    } catch (e) {
      // Ignore
    }
    return { assignee: undefined, tags: [], attachments: [], checklist: [], sprint: undefined };
  }, [task.id, task.projectId]);

  const { assignee, tags, attachments, checklist, sprint } = localProjectData;

  const prio = priorityConfig[task.priority] || priorityConfig.P2;
  const initial = assignee ? (assignee.name || assignee.email || '?').charAt(0).toUpperCase() : (task.createdBy?.name || '?').charAt(0).toUpperCase();
  const avatarBg = assignee ? 'bg-indigo-600' : 'bg-slate-550';

  // Format Due Date styles
  const getDueDateStyles = () => {
    if (!task.dueDate) return 'border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/30 text-slate-500';
    const due = new Date(task.dueDate);
    const now = new Date();
    if (task.status === 'DONE') {
      return 'border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400';
    }
    if (due < now) {
      return 'border-rose-100 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold animate-pulse';
    }
    if (due.getTime() - now.getTime() < 48 * 60 * 60 * 1000) {
      return 'border-amber-105 dark:border-amber-950 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-405';
    }
    return 'border-slate-205 dark:border-slate-850 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400';
  };

  const commentCount = task.comments?.length || 0;
  const attachmentCount = attachments?.length || 0;

  // Checklist Calculations
  const totalItems = checklist?.length || 0;
  const completedItems = checklist ? checklist.filter((c: any) => c.completed).length : 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group w-full rounded-2xl border border-slate-205 dark:border-slate-850/80 bg-white dark:bg-slate-900/60 p-4 text-left shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 ease-out cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-30 shadow-2xl border-dashed border-indigo-500 scale-[0.97] rotate-1' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex flex-col gap-2.5" onClick={() => onClick?.(task)}>
        {/* Top Priority / Sprint group info */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${prio.bg} ${prio.text} uppercase tracking-wider`}>
            <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`}></span>
            {prio.label}
          </span>

          {sprint && (
            <span className="text-[9px] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-lg font-mono border border-slate-205 dark:border-slate-850 font-bold">
              🏃 {sprint.name}
            </span>
          )}
        </div>

        {/* Task Title */}
        <h3 className="text-xs font-bold text-slate-850 dark:text-slate-100 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors leading-snug break-words">
          {task.title}
        </h3>

        {/* Description Snippet */}
        {task.description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-450 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Custom Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.map((tag: string, index: number) => (
              <span
                key={tag}
                className={`text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  tagColors[index % tagColors.length]
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Dynamic Checklist Progress indicators inside card face */}
        {totalItems > 0 && (
          <div className="space-y-1.5 mt-1.5">
            <div className="flex items-center justify-between text-[9px] text-slate-450 dark:text-slate-500 font-extrabold font-mono leading-none">
              <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3 text-indigo-500" /> {completedItems}/{totalItems} Completed</span>
              <span>{Math.round((completedItems / totalItems) * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-205 dark:border-slate-850/50">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${(completedItems / totalItems) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Separator */}
        <div className="h-px bg-slate-100/60 dark:bg-slate-800/80 my-1"></div>

        {/* Footer info (Dates, comments count, assignee) */}
        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            {task.dueDate ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold border ${getDueDateStyles()}`}>
                <Calendar className="h-3 w-3" /> {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            ) : (
              <span className="text-[9px] text-slate-400 dark:text-slate-600">No date</span>
            )}

            {/* Comment metrics */}
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-400 dark:text-slate-500" title={`${commentCount} comments`}>
                <MessageSquare className="h-3 w-3" /> {commentCount}
              </span>
            )}

            {/* Attachment metrics */}
            {attachmentCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-400 dark:text-slate-500" title={`${attachmentCount} attachments`}>
                <Paperclip className="h-3 w-3" /> {attachmentCount}
              </span>
            )}
          </div>

          {/* Assignee stacked group avatar */}
          <div className="relative group/avatar flex-shrink-0">
            <div
              className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm ring-1 ring-white dark:ring-slate-900 ${avatarBg}`}
              title={assignee ? assignee.name || assignee.email : (task.createdBy?.name || 'Unassigned')}
            >
              {initial}
            </div>
            <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-1.5 hidden group-hover/avatar:block bg-slate-950 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-30 font-sans">
              {assignee ? assignee.name || assignee.email : `Created by ${task.createdBy?.name || 'Unknown'}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
