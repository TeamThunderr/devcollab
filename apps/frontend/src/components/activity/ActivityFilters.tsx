import React from 'react';
import useWorkspaceStore from '../../stores/workspaceStore';
import { ActivityFilters } from '../../services/api/activity.service';

interface ActivityFiltersProps {
  filters: ActivityFilters;
  onFilterChange: (newFilters: Partial<ActivityFilters>) => void;
}

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'WORKSPACE_CREATED', label: 'Workspace Created' },
  { value: 'MEMBER_INVITED', label: 'Invited Members' },
  { value: 'INVITE_ACCEPTED', label: 'Accepted Invites' },
  { value: 'ROLE_UPDATED', label: 'Role Changes' },
  { value: 'MEMBER_REMOVED', label: 'Removed Members' },
];

export default function ActivityFiltersComponent({ filters, onFilterChange }: ActivityFiltersProps) {
  const { members } = useWorkspaceStore();

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
          Filter by Member
        </label>
        <select
          value={filters.userId || ''}
          onChange={(e) => onFilterChange({ userId: e.target.value || undefined })}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
        >
          <option value="">Anyone</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user?.name || m.user?.email || 'Unknown User'}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
          Action Type
        </label>
        <select
          value={filters.action || ''}
          onChange={(e) => onFilterChange({ action: e.target.value || undefined })}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
        >
          {ACTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
