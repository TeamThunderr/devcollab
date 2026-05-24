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
  P0: { label: 'Critical', text: 'text-rose-400', bg: 'bg-rose-500/10 border border-rose-500/15', dot: 'bg-rose-500' },
  P1: { label: 'High', text: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/15', dot: 'bg-amber-500' },
  P2: { label: 'Normal', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/15', dot: 'bg-emerald-500' },
};

const tagColors = [
  'bg-blue-500/10 text-blue-400 border-blue-500/15',
  'bg-purple-500/10 text-purple-400 border-purple-500/15',
  'bg-teal-500/10 text-teal-400 border-teal-500/15',
  'bg-pink-500/10 text-pink-400 border-pink-500/15',
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
  const avatarBg = assignee ? 'bg-indigo-650' : 'bg-slate-700';

  // Format Due Date styles
  const getDueDateStyles = () => {
    if (!task.dueDate) return 'border-white/[0.04] bg-white/[0.01] text-slate-500';
    const due = new Date(task.dueDate);
    const now = new Date();
    if (task.status === 'DONE') {
      return 'border-emerald-500/10 bg-emerald-500/5 text-emerald-400';
    }
    if (due < now) {
      return 'border-rose-500/20 bg-rose-500/10 text-rose-400 font-bold';
    }
    if (due.getTime() - now.getTime() < 48 * 60 * 60 * 1000) {
      return 'border-amber-500/20 bg-amber-500/10 text-amber-400';
    }
    return 'border-white/[0.04] bg-[#0c0d10] text-slate-400';
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
      className={`group w-full rounded-xl border border-white/[0.04] bg-[#121318]/45 p-4 text-left shadow-sm hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.4)] hover:border-indigo-500/20 hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-30 border-dashed border-indigo-500/40 scale-[0.98]' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex flex-col gap-3" onClick={() => onClick?.(task)}>
        {/* Top Priority / Sprint group info */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${prio.bg} ${prio.text}`}>
            <span className={`w-1 h-1 rounded-full ${prio.dot}`}></span>
            {prio.label}
          </span>

          {sprint && (
            <span className="text-[8px] bg-black/20 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-white/[0.03] font-bold">
              🏃 {sprint.name}
            </span>
          )}
        </div>

        {/* Task Title */}
        <h3 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors leading-snug break-words">
          {task.title}
        </h3>

        {/* Description Snippet */}
        {task.description && (
          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2 font-medium">
            {task.description}
          </p>
        )}

        {/* Custom Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {tags.map((tag: string, index: number) => (
              <span
                key={tag}
                className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  tagColors[index % tagColors.length]
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Checklist Progress indicator inside card face */}
        {totalItems > 0 && (
          <div className="space-y-1.5 mt-0.5">
            <div className="flex items-center justify-between text-[8px] text-slate-500 font-extrabold font-mono leading-none">
              <span className="flex items-center gap-1"><CheckSquare className="h-2.5 w-2.5 text-indigo-500" /> {completedItems}/{totalItems} Done</span>
              <span>{Math.round((completedItems / totalItems) * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/[0.02]">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${(completedItems / totalItems) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Separator */}
        <div className="h-px bg-white/[0.03] my-0.5"></div>

        {/* Footer info (Dates, comments count, assignee) */}
        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            {task.dueDate ? (
              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[8px] font-extrabold border ${getDueDateStyles()}`}>
                <Calendar className="h-2.5 w-2.5" /> {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            ) : (
              <span className="text-[8px] text-slate-600 font-medium">No date</span>
            )}

            {/* Comment metrics */}
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-slate-600" title={`${commentCount} comments`}>
                <MessageSquare className="h-2.5 w-2.5" /> {commentCount}
              </span>
            )}

            {/* Attachment metrics */}
            {attachmentCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-slate-600" title={`${attachmentCount} attachments`}>
                <Paperclip className="h-2.5 w-2.5" /> {attachmentCount}
              </span>
            )}
          </div>

          {/* Assignee avatar */}
          <div className="relative group/avatar flex-shrink-0">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm ring-1 ring-[#08090a] ${avatarBg}`}
              title={assignee ? assignee.name || assignee.email : (task.createdBy?.name || 'Unassigned')}
            >
              {initial}
            </div>
            <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-1.5 hidden group-hover/avatar:block bg-black border border-white/[0.04] text-white text-[8px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-30 font-sans">
              {assignee ? assignee.name || assignee.email : `Created by ${task.createdBy?.name || 'Unknown'}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
