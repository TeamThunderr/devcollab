import React, { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import useWorkspaceStore from "../../stores/workspaceStore";
import { WorkspaceRole } from "../../types";
import InviteMemberModal from "../../components/workspace/InviteMemberModal";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { canAccessSettings, canManageMembers as checkCanManageMembers } from "../../lib/permissions";

const ROLE_BADGES: Record<WorkspaceRole, string> = {
  OWNER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  MEMBER: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  VIEWER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

export default function WorkspaceSettingsPage(): React.ReactElement {
  const { workspaceId } = useParams();
  const { user } = useAuthStore();
  const { activeWorkspace, members, isLoading, fetchWorkspaceDetails, updateMemberRole, removeMember } = useWorkspaceStore();
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceId && (!activeWorkspace || activeWorkspace.id !== workspaceId)) {
      fetchWorkspaceDetails(workspaceId).catch(console.error);
    }
  }, [workspaceId, activeWorkspace, fetchWorkspaceDetails]);

  // Determine current user's permissions
  const currentUserMember = members.find((m) => m.userId === user?.id);
  const userRole = currentUserMember?.role || 'VIEWER';
  const canManageMembers = checkCanManageMembers(userRole);
  const isAllowed = canAccessSettings(userRole);

  const handleUpdateRole = async (memberId: string, newRole: WorkspaceRole) => {
    if (!workspaceId) return;
    setProcessingId(memberId);
    try {
      await updateMemberRole(workspaceId, memberId, newRole);
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!workspaceId) return;
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    setProcessingId(memberId);
    try {
      await removeMember(workspaceId, memberId);
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading && (!activeWorkspace || activeWorkspace.id !== workspaceId)) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="p-8 text-center text-gray-500">
        Workspace not found or you don't have access.
      </div>
    );
  }

  // Prevent members/viewers from accessing settings
  if (!isAllowed && !isLoading && members.length > 0) {
    return <Navigate to={`/w/${workspaceId}`} replace />;
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {activeWorkspace.name}
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {userRole}
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your workspace settings and team members here.
          </p>
        </div>
        
        {canManageMembers && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite Member
          </button>
        )}
      </div>

      {/* Members Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members ({members.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">User</th>
                <th scope="col" className="px-6 py-3">Role</th>
                <th scope="col" className="px-6 py-3">Joined</th>
                {canManageMembers && <th scope="col" className="px-6 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isMe = member.userId === user?.id;
                const isOwner = member.role === 'OWNER';
                
                return (
                  <tr key={member.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                          {member.user.name ? member.user.name.substring(0, 2).toUpperCase() : member.user.email.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            {member.user.name || 'Unnamed User'}
                            {isMe && (
                              <span className="text-[10px] font-bold bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{member.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {canManageMembers && !isOwner && !isMe ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.userId, e.target.value as WorkspaceRole)}
                          disabled={processingId === member.userId}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-white disabled:opacity-50"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${ROLE_BADGES[member.role]}`}>
                          {member.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    {canManageMembers && (
                      <td className="px-6 py-4 text-right">
                        {!isOwner && !isMe && (
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={processingId === member.userId}
                            className="font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {workspaceId && (
        <InviteMemberModal 
          isOpen={isInviteModalOpen} 
          onClose={() => setIsInviteModalOpen(false)} 
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
