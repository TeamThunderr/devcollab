import React, { useState, useEffect } from 'react';
import useWorkspaceStore from '../../stores/workspaceStore';
import { WorkspaceRole } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';
import { toast } from '../../stores/toastStore';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

const ROLES: { value: WorkspaceRole; label: string; description: string }[] = [
  { value: 'ADMIN', label: 'Admin', description: 'Can manage workspace settings, billing, and members.' },
  { value: 'MEMBER', label: 'Member', description: 'Can create and edit projects, tasks, and snippets.' },
  { value: 'VIEWER', label: 'Viewer', description: 'Can only view projects, tasks, and snippets. Cannot edit.' },
];

export default function InviteMemberModal({ isOpen, onClose, workspaceId }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('MEMBER');
  const [isSuccess, setIsSuccess] = useState(false);
  const { inviteMember, isLoading, error, clearError } = useWorkspaceStore();

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('MEMBER');
      setIsSuccess(false);
      clearError();
    }
  }, [isOpen, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !workspaceId) return;

    try {
      await inviteMember(workspaceId, email, role);
      toast.success('Invite sent', `${email} will receive an invitation email`);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      // Error handled by store / HTTP interceptor
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-700/60">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white">Invite Member</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="Close invite modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isSuccess ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center text-green-400 mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white text-center">
                Invite Sent!
              </h3>
              <p className="text-sm text-gray-400 text-center mt-2">
                We've sent an invitation email to {email}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <div className="space-y-2">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      role === r.value
                        ? 'bg-blue-900/20 border-blue-700'
                        : 'border-gray-700 hover:bg-gray-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                      className="mt-1 flex-shrink-0 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {r.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {r.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-950/30 rounded-lg border border-red-800/50">
                {error}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : null}
                Send Invite
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
