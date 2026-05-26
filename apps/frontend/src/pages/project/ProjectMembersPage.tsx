import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import { useProjectStore } from "../../stores/projectStore";
import useWorkspaceStore from "../../stores/workspaceStore";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import AssignMemberModal from "../../components/project/AssignMemberModal";

export default function ProjectMembersPage(): React.ReactElement {
  const { projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const { user } = useAuthStore();
  const { members: workspaceMembers } = useWorkspaceStore();
  const { 
    projects, 
    projectMembers, 
    fetchProjectMembers, 
    removeProjectMember 
  } = useProjectStore();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProjectMembers(projectId).catch(console.error);
    }
  }, [projectId, fetchProjectMembers]);

  const project = projects.find(p => p.id === projectId);
  const members = projectId ? (projectMembers[projectId] || []) : [];

  const currentUserWorkspaceMember = workspaceMembers.find(m => m.userId === user?.id);
  const workspaceRole = currentUserWorkspaceMember?.role ?? "VIEWER";
  
  // Only workspace owners/admins can manage project members
  const canManageMembers = workspaceRole === "OWNER" || workspaceRole === "ADMIN";

  const handleRemoveMember = async (userId: string) => {
    if (!projectId) return;
    if (!window.confirm("Are you sure you want to remove this member from the project?")) return;
    setProcessingId(userId);
    try {
      await removeProjectMember(projectId, userId);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Members
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""} assigned to{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {project.name}
            </span>
          </p>
        </div>

        {canManageMembers && (
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Assign Member
          </button>
        )}
      </div>

      {/* Members table */}
      <div className="bg-white dark:bg-[#17191d] border border-gray-200 dark:border-white/[0.04] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-black/20 dark:text-gray-400 border-b border-gray-200 dark:border-white/[0.04]">
              <tr>
                <th scope="col" className="px-6 py-3">User</th>
                {canManageMembers && (
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                 <tr className="bg-white border-b dark:bg-transparent dark:border-white/[0.04]">
                 <td colSpan={2} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                   No members explicitly assigned to this project yet. Workspace Owners/Admins still have access.
                 </td>
               </tr>
              ) : members.map((member) => {
                const isMe = member.userId === user?.id;

                return (
                  <tr
                    key={member.id}
                    className="bg-white border-b dark:bg-transparent dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                          {(member.user?.name ?? member.user?.email ?? "U").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            {member.user?.name ?? "Unnamed User"}
                            {isMe && (
                              <span className="text-[10px] font-bold bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{member.user?.email ?? "No email"}</div>
                        </div>
                      </div>
                    </td>
                    {canManageMembers && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={processingId === member.userId}
                          className="font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {projectId && (
        <AssignMemberModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          projectId={projectId}
        />
      )}
    </div>
  );
}
