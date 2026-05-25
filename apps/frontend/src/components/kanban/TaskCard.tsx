import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import { MessageSquare, Paperclip, Calendar, CheckSquare } from 'lucide-react';
import useRealtimeStore from '../../stores/realtimeStore';
import useAuthStore from '../../stores/authStore';

interface TaskCardProps {
  task: Task;
  config?: any;
  onClick?: (task: Task) => void;
  isHighlighted?: boolean;
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

export default function TaskCard({ task, config, onClick, isHighlighted }: TaskCardProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
      status: task.status,
    },
  });

  // Load extensions reactively or from localStorage fallback to prevent stale states
  const localProjectData = React.useMemo(() => {
    if (config) {
      const taskAssignee = config.assignees?.[task.id];
      const taskTags = config.tags?.[task.id] || [];
      const taskAttachments = config.attachments?.[task.id] || [];
      const savedChecklist = config.checklists?.[task.id] || [];
      const sprint = config.sprints?.find((s: any) => s.taskIds?.includes(task.id));
      return { assignee: taskAssignee, tags: taskTags, attachments: taskAttachments, checklist: savedChecklist, sprint };
    }
    try {
      const stored = localStorage.getItem(`devcollab_project_workspace_${task.projectId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const taskAssignee = parsed.assignees?.[task.id];
        const taskTags = parsed.tags?.[task.id] || [];
        const taskAttachments = parsed.attachments?.[task.id] || [];
        const savedChecklist = parsed.checklists?.[task.id] || [];
        const sprint = parsed.sprints?.find((s: any) => s.taskIds?.includes(task.id));
        return { assignee: taskAssignee, tags: taskTags, attachments: taskAttachments, checklist: savedChecklist, sprint };
      }
    } catch (e) {
      // Ignore
    }
    return { assignee: undefined, tags: [], attachments: [], checklist: [], sprint: undefined };
  }, [task.id, task.projectId, config]);

  const { assignee, tags, attachments, checklist, sprint } = localProjectData;
  const taskViewers = useRealtimeStore(s => s.taskViewers?.[task.id] || []);
  const currentUser = useAuthStore(s => s.user);
  
  const othersViewing = taskViewers.filter(u => u.userId !== currentUser?.id);

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

  // Auto-clear highlight after 3 s
  const [showHighlight, setShowHighlight] = React.useState(isHighlighted ?? false);
  React.useEffect(() => {
    if (isHighlighted) {
      setShowHighlight(true);
      const t = setTimeout(() => setShowHighlight(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isHighlighted]);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group w-full rounded-lg border bg-[#1e2025] p-3 text-left shadow-sm hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 transition-all duration-150 ease-out cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-30 border-dashed border-indigo-500/40 scale-[0.98]' : ''
      } ${
        showHighlight
          ? 'border-violet-500/50 shadow-[0_0_0_2px_rgba(139,92,246,0.25),0_8px_24px_-6px_rgba(139,92,246,0.3)] animate-pulse'
          : 'border-white/[0.04] hover:border-indigo-500/20'
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex flex-col gap-2" onClick={() => onClick?.(task)}>
        {/* Title & Assignee Row */}
        <div className="flex items-start justify-between gap-2.5">
          <h3 className="text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors leading-snug break-words">
            {task.title}
          </h3>
          
          {/* Assignee avatar */}
          <div className="relative group/avatar flex-shrink-0 mt-0.5">
            <div
              className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[7px] font-bold text-white shadow-sm ring-1 ring-[#121316] ${avatarBg}`}
              title={assignee ? assignee.name || assignee.email : (task.createdBy?.name || 'Unassigned')}
            >
              {initial}
            </div>
            <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-1.5 hidden group-hover/avatar:block bg-black border border-white/[0.04] text-white text-[8px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-30 font-sans">
              {assignee ? assignee.name || assignee.email : `Created by ${task.createdBy?.name || 'Unknown'}`}
            </div>
          </div>
        </div>

        {/* Optional Description snippet - tight line clamp */}
        {task.description && (
          <p className="text-[10px] text-slate-500 leading-normal line-clamp-1 font-medium -mt-0.5">
            {task.description}
          </p>
        )}

        {/* Priority & Due Date & Metadata Row */}
        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Priority Badge */}
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${prio.bg} ${prio.text}`}>
              <span className={`w-1 h-1 rounded-full ${prio.dot}`}></span>
              {task.priority}
            </span>

            {/* Due date Badge */}
            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[8px] font-extrabold border ${getDueDateStyles()}`}>
                <Calendar className="h-2.5 w-2.5" /> {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}

            {/* Sprint Tag */}
            {sprint && (
              <span className="text-[8px] bg-black/20 text-slate-500 px-1.5 py-0.5 rounded font-mono border border-white/[0.03] font-bold">
                🏃 {sprint.name}
              </span>
            )}
          </div>

          {/* Comment & Attachment & Checklist Counts */}
          <div className="flex items-center gap-1.5 flex-shrink-0 text-slate-650">
            {othersViewing.length > 0 && (
              <div className="flex items-center mr-1">
                {othersViewing.slice(0, 2).map((u, i) => (
                  <div 
                    key={u.userId} 
                    className="w-4 h-4 rounded-full ring-1 ring-[#1e2025] overflow-hidden bg-indigo-500 flex items-center justify-center -ml-1.5 first:ml-0 relative"
                    title={`${u.name} is viewing this`}
                    style={{ zIndex: i }}
                  >
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[7px] font-bold text-white uppercase">{(u.name || '?').charAt(0)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {totalItems > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold" title={`${completedItems}/${totalItems} items completed`}>
                <CheckSquare className="h-2.5 w-2.5" /> {completedItems}/{totalItems}
              </span>
            )}
            
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold" title={`${commentCount} comments`}>
                <MessageSquare className="h-2.5 w-2.5" /> {commentCount}
              </span>
            )}

            {attachmentCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold" title={`${attachmentCount} attachments`}>
                <Paperclip className="h-2.5 w-2.5" /> {attachmentCount}
              </span>
            )}
          </div>
        </div>

        {/* Custom Tags (if any) rendered micro-sized */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.map((tag: string, index: number) => (
              <span
                key={tag}
                className={`text-[8px] font-extrabold uppercase tracking-wider px-1 px-0.5 rounded border ${
                  tagColors[index % tagColors.length]
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
