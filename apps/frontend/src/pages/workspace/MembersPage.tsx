/**
 * src/pages/workspace/MembersPage.tsx
 *
 * Dedicated /w/:workspaceId/members page.
 * Fully dark-themed (no dark: prefixes), with:
 *  - Role badges (amber=Owner, blue=Admin, zinc=Member/Viewer)
 *  - ConfirmDialog for remove
 *  - Online status dots from realtimeStore
 *  - EmptyState when alone
 */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Users, UserPlus, Shield, Crown, Eye } from "lucide-react";
import useAuthStore from "../../stores/authStore";
import useWorkspaceStore from "../../stores/workspaceStore";
import useRealtimeStore from "../../stores/realtimeStore";
import { WorkspaceRole } from "../../types";
import InviteMemberModal from "../../components/workspace/InviteMemberModal";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";
import { cn } from "../../lib/utils";

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<WorkspaceRole, { label: string; classes: string; Icon: React.FC<{ className?: string }> }> = {
  OWNER:  { label: "Owner",  classes: "bg-amber-500/10 text-amber-400 border border-amber-500/20",  Icon: Crown  },
  ADMIN:  { label: "Admin",  classes: "bg-blue-500/10 text-blue-400 border border-blue-500/20",     Icon: Shield },
  MEMBER: { label: "Member", classes: "bg-zinc-700/40 text-zinc-300 border border-zinc-700/40",     Icon: Users  },
  VIEWER: { label: "Viewer", classes: "bg-zinc-800/40 text-zinc-500 border border-zinc-700/30",     Icon: Eye    },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MembersPage(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuthStore();
  const {
    activeWorkspace,
    members,
    isLoading,
    fetchWorkspaceDetails,
    updateMemberRole,
    removeMember,
  } = useWorkspaceStore();

  const onlineUsers = useRealtimeStore((s) => s.onlineUsers ?? []);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (workspaceId && (!activeWorkspace || activeWorkspace.id !== workspaceId)) {
      fetchWorkspaceDetails(workspaceId).catch(() => {});
    }
  }, [workspaceId, activeWorkspace, fetchWorkspaceDetails]);

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const userRole = currentUserMember?.role ?? "VIEWER";
  const canManageMembers = userRole === "OWNER" || userRole === "ADMIN";

  const isOnline = (userId: string) =>
    onlineUsers.some((u: any) => u.userId === userId);

  const handleUpdateRole = async (memberId: string, newRole: WorkspaceRole) => {
    if (!workspaceId) return;
    setProcessingId(memberId);
    try {
      await updateMemberRole(workspaceId, memberId, newRole);
    } catch {
      // HTTP interceptor shows toast
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!workspaceId || !confirmRemove) return;
    setProcessingId(confirmRemove.id);
    try {
      await removeMember(workspaceId, confirmRemove.id);
    } catch {
      // HTTP interceptor shows toast
    } finally {
      setProcessingId(null);
      setConfirmRemove(null);
    }
  };

  if (isLoading && (!activeWorkspace || activeWorkspace.id !== workspaceId)) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Only the owner
  const nonOwnerMembers = members.filter((m) => m.role !== "OWNER");

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Team Members</h1>
          <p className="text-sm text-gray-500 mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""} in{" "}
            <span className="font-medium text-gray-300">
              {activeWorkspace?.name ?? "this workspace"}
            </span>
          </p>
        </div>

        {canManageMembers && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Empty state — only you */}
      {nonOwnerMembers.length === 0 && (
        <EmptyState
          icon={Users}
          title="Just you so far"
          subtitle="Invite your teammates to collaborate on this workspace"
          cta={canManageMembers ? {
            label: "Invite Members",
            icon: UserPlus,
            onClick: () => setIsInviteModalOpen(true),
          } : undefined}
          className="py-12"
        />
      )}

      {/* Members table */}
      {members.length > 0 && (
        <div className="bg-[#17191d] border border-white/[0.04] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-[#1e2025] border-b border-white/[0.04]">
                <tr>
                  <th scope="col" className="px-6 py-3 font-semibold tracking-wider">User</th>
                  <th scope="col" className="px-6 py-3 font-semibold tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 font-semibold tracking-wider">Joined</th>
                  {canManageMembers && (
                    <th scope="col" className="px-6 py-3 text-right font-semibold tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {members.map((member) => {
                  const isMe = member.userId === user?.id;
                  const isOwner = member.role === "OWNER";
                  const online = isOnline(member.userId);
                  const badge = ROLE_BADGE[member.role];
                  const BadgeIcon = badge.Icon;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-white/[0.01] transition-colors"
                    >
                      {/* User cell */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar with online dot */}
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                              {(member.user.name ?? member.user.email).substring(0, 2).toUpperCase()}
                            </div>
                            {/* Online indicator */}
                            <span
                              className={cn(
                                "absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-[#17191d]",
                                online ? "bg-green-400" : "bg-gray-600",
                              )}
                              title={online ? "Online" : "Offline"}
                            />
                          </div>

                          <div>
                            <div className="font-medium text-white flex items-center gap-2">
                              {member.user.name ?? "Unnamed User"}
                              {isMe && (
                                <span className="text-[10px] font-bold bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{member.user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role cell */}
                      <td className="px-6 py-4">
                        {canManageMembers && !isOwner && !isMe ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.userId, e.target.value as WorkspaceRole)}
                            disabled={processingId === member.userId}
                            className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 block w-full p-2 disabled:opacity-50 appearance-none cursor-pointer"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="MEMBER">Member</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                        ) : (
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md", badge.classes)}>
                            <BadgeIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        )}
                      </td>

                      {/* Joined date */}
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      {canManageMembers && (
                        <td className="px-6 py-4 text-right">
                          {!isOwner && !isMe && (
                            <button
                              onClick={() => setConfirmRemove({
                                id: member.userId,
                                name: member.user.name ?? member.user.email,
                              })}
                              disabled={processingId === member.userId}
                              className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
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
      )}

      {/* Invite modal */}
      {workspaceId && (
        <InviteMemberModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          workspaceId={workspaceId}
        />
      )}

      {/* Remove confirm dialog */}
      <ConfirmDialog
        isOpen={!!confirmRemove}
        title={`Remove ${confirmRemove?.name ?? "member"}?`}
        message="They will lose access to this workspace and all its projects. You can re-invite them later."
        confirmLabel="Remove"
        onConfirm={handleRemoveMember}
        onCancel={() => setConfirmRemove(null)}
        isLoading={!!processingId}
      />
    </div>
  );
}
