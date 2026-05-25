import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, WorkspaceMember } from '../../types';
import { DatePicker } from '../../components/ui/DatePicker';
import { MessageSquare, Paperclip, ArrowUpDown, ChevronUp, ChevronDown, CheckSquare } from 'lucide-react';

interface ListViewProps {
  tasks: Task[];
  members: WorkspaceMember[];
  config: any;
  onUpdateMetadata: (taskId: string, category: 'assignees' | 'tags' | 'attachments' | 'checklists', data: any) => void;
  onTaskClick: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: any) => Promise<any>;
  projectId: string;
}

const parseLocalDate = (dateStr?: string): Date | undefined => {
  if (!dateStr) return undefined;
  const matches = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!matches) return new Date(dateStr);
  const [_, year, month, day] = matches;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
};

const formatLocalDateToUTCNoon = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T12:00:00.000Z`;
};

const statusConfig: Record<TaskStatus, { label: string; text: string; bg: string }> = {
  TODO: { label: 'To Do', text: 'text-slate-400 border-slate-500/20', bg: 'bg-slate-500/10' },
  IN_PROGRESS: { label: 'In Progress', text: 'text-cyan-400 border-cyan-500/20', bg: 'bg-cyan-500/10' },
  IN_REVIEW: { label: 'In Review', text: 'text-purple-400 border-purple-500/20', bg: 'bg-purple-500/10' },
  DONE: { label: 'Completed', text: 'text-emerald-400 border-emerald-500/20', bg: 'bg-emerald-500/10' },
};

const priorityConfig: Record<TaskPriority, { label: string; text: string; bg: string }> = {
  P0: { label: 'Critical', text: 'text-rose-400 border-rose-500/25', bg: 'bg-rose-500/10' },
  P1: { label: 'High', text: 'text-amber-400 border-amber-500/25', bg: 'bg-amber-500/10' },
  P2: { label: 'Normal', text: 'text-emerald-400 border-emerald-500/25', bg: 'bg-emerald-500/10' },
};

const tagColors = [
  'bg-blue-500/10 text-blue-400 border-blue-500/15',
  'bg-purple-500/10 text-purple-400 border-purple-500/15',
  'bg-teal-500/10 text-teal-400 border-teal-500/15',
  'bg-pink-500/10 text-pink-400 border-pink-500/15',
];

export default function ListView({
  tasks,
  members,
  config,
  onUpdateMetadata,
  onTaskClick,
  onUpdateTask,
  projectId: _projectId
}: ListViewProps): React.ReactElement {
  const [sortField, setSortField] = useState<'title' | 'status' | 'priority' | 'dueDate' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Consume unified metadata from config prop reactively
  const localMetadata = useMemo(() => {
    return {
      assignees: config?.assignees || {},
      tags: config?.tags || {},
      attachments: config?.attachments || {},
      checklists: config?.checklists || {},
    };
  }, [config]);

  const handleSort = (field: 'title' | 'status' | 'priority' | 'dueDate') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    if (!sortField) return tasks;

    const priorityWeights = { P0: 3, P1: 2, P2: 1 };
    const statusWeights = { TODO: 1, IN_PROGRESS: 2, IN_REVIEW: 3, DONE: 4 };

    return [...tasks].sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (sortField === 'priority') {
        valA = priorityWeights[a.priority] || 0;
        valB = priorityWeights[b.priority] || 0;
      } else if (sortField === 'status') {
        valA = statusWeights[a.status] || 0;
        valB = statusWeights[b.status] || 0;
      } else if (sortField === 'dueDate') {
        valA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sortField, sortDirection]);

  const getSortIcon = (field: 'title' | 'status' | 'priority' | 'dueDate') => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-slate-500 ml-1 opacity-0 group-hover:opacity-100 transition" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 text-indigo-400 ml-1" />
      : <ChevronDown className="h-3 w-3 text-indigo-400 ml-1" />;
  };

  return (
    <div className="rounded-2xl border border-white/[0.04] bg-[#17191d] shadow-sm overflow-hidden select-none">
      <div className="overflow-x-auto premium-scrollbar">
        <table className="w-full border-collapse text-left text-xs text-slate-300 min-w-[800px]">
          <thead>
            <tr className="border-b border-white/[0.04] bg-black/15 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 sticky top-0 z-10">
              <th onClick={() => handleSort('title')} className="px-4 py-3.5 cursor-pointer group hover:text-white transition">
                <span className="flex items-center">Task {getSortIcon('title')}</span>
              </th>
              <th className="px-4 py-3.5 text-slate-500">Assignee</th>
              <th onClick={() => handleSort('status')} className="px-4 py-3.5 cursor-pointer group hover:text-white transition">
                <span className="flex items-center">Status {getSortIcon('status')}</span>
              </th>
              <th onClick={() => handleSort('priority')} className="px-4 py-3.5 cursor-pointer group hover:text-white transition">
                <span className="flex items-center">Priority {getSortIcon('priority')}</span>
              </th>
              <th onClick={() => handleSort('dueDate')} className="px-4 py-3.5 cursor-pointer group hover:text-white transition">
                <span className="flex items-center">Due Date {getSortIcon('dueDate')}</span>
              </th>
              <th className="px-4 py-3.5 text-slate-500">Labels</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03] bg-white/[0.002]">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                  No tasks found matching current filters.
                </td>
              </tr>
            ) : (
              sortedTasks.map(task => {
                const assignee = localMetadata.assignees[task.id];
                const tags = localMetadata.tags[task.id] || [];
                const attachments = localMetadata.attachments[task.id] || [];
                const checklist = localMetadata.checklists[task.id] || [];

                const commentCount = task.comments?.length || 0;
                const attachmentCount = attachments.length || 0;
                const totalChecklist = checklist.length || 0;
                const completedChecklist = checklist.filter((c: any) => c.completed).length;

                const statusVal = statusConfig[task.status] || statusConfig.TODO;
                const prioVal = priorityConfig[task.priority] || priorityConfig.P2;

                // Overdue styling using timezone-proof YYYY-MM-DD string prefix comparison
                const todayStr = new Date().toISOString().substring(0, 10);
                const dueStr = task.dueDate ? task.dueDate.substring(0, 10) : '';
                const isOverdue = dueStr && dueStr < todayStr && task.status !== 'DONE';

                return (
                  <tr 
                    key={task.id} 
                    className="hover:bg-white/[0.015] transition-colors duration-100 group/row"
                  >
                    {/* Title Column */}
                    <td className="px-4 py-3.5 font-semibold text-slate-200 align-middle max-w-xs">
                      <div className="flex flex-col gap-1">
                        <span 
                          onClick={() => onTaskClick(task)}
                          className="hover:text-indigo-400 cursor-pointer transition truncate block"
                          title={task.title}
                        >
                          {task.title}
                        </span>
                        
                        {/* Micro stats under title */}
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-500 font-medium">
                          {totalChecklist > 0 && (
                            <span className="flex items-center gap-0.5" title="Checklist progress">
                              <CheckSquare className="h-2.5 w-2.5" /> {completedChecklist}/{totalChecklist}
                            </span>
                          )}
                          {commentCount > 0 && (
                            <span className="flex items-center gap-0.5" title="Comments">
                              <MessageSquare className="h-2.5 w-2.5" /> {commentCount}
                            </span>
                          )}
                          {attachmentCount > 0 && (
                            <span className="flex items-center gap-0.5" title="Attachments">
                              <Paperclip className="h-2.5 w-2.5" /> {attachmentCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Assignee Column */}
                    <td className="px-4 py-3.5 align-middle">
                      <select
                        value={assignee?.id || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const memberUser = members.find(m => m.userId === val)?.user;
                          onUpdateMetadata(task.id, 'assignees', memberUser || null);
                          // Trigger database update
                          void onUpdateTask(task.id, { });
                        }}
                        className="bg-transparent border-0 outline-none text-xs text-slate-400 font-semibold cursor-pointer py-1 pr-4 focus:ring-0 focus:text-white transition"
                      >
                        <option value="">👤 Unassigned</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            👤 {m.user?.name || m.user?.email || 'Unnamed'}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status Column */}
                    <td className="px-4 py-3.5 align-middle">
                      <select
                        value={task.status}
                        onChange={(e) => {
                          const val = e.target.value as TaskStatus;
                          void onUpdateTask(task.id, { status: val });
                        }}
                        className={`bg-slate-950 border border-white/[0.04] rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide cursor-pointer focus:ring-0 focus:border-indigo-500 transition ${statusVal.text}`}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="DONE">Done</option>
                      </select>
                    </td>

                    {/* Priority Column */}
                    <td className="px-4 py-3.5 align-middle">
                      <select
                        value={task.priority}
                        onChange={(e) => {
                          const val = e.target.value as TaskPriority;
                          void onUpdateTask(task.id, { priority: val });
                        }}
                        className={`bg-slate-950 border border-white/[0.04] rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide cursor-pointer focus:ring-0 focus:border-indigo-500 transition ${prioVal.text}`}
                      >
                        <option value="P0">P0 (Critical)</option>
                        <option value="P1">P1 (High)</option>
                        <option value="P2">P2 (Normal)</option>
                      </select>
                    </td>

                    {/* Due Date Column */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="w-[145px]">
                        <DatePicker
                          date={parseLocalDate(task.dueDate)}
                          setDate={(date) => {
                            void onUpdateTask(task.id, { dueDate: date ? formatLocalDateToUTCNoon(date) : null });
                          }}
                          placeholder="Set due date"
                        />
                        {isOverdue && (
                          <span className="text-[8px] text-rose-400 font-extrabold uppercase tracking-wider block mt-1 ml-1 animate-pulse">
                            ⚠️ Overdue
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Labels Column */}
                    <td className="px-4 py-3.5 align-middle">
                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {tags.slice(0, 2).map((tag: string, index: number) => (
                            <span
                              key={tag}
                              className={`text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                tagColors[index % tagColors.length]
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                          {tags.length > 2 && (
                            <span className="text-[8px] font-bold text-slate-500 px-1 bg-black/10 rounded">
                              +{tags.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">No labels</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
