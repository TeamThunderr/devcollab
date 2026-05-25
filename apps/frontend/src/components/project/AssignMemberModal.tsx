import React, { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import useWorkspaceStore from "../../stores/workspaceStore";
import { X, UserPlus, Search } from "lucide-react";

interface AssignMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export default function AssignMemberModal({ isOpen, onClose, projectId }: AssignMemberModalProps): React.ReactElement | null {
  const { assignProjectMember, projectMembers } = useProjectStore();
  const { members: workspaceMembers } = useWorkspaceStore();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const currentProjectMembers = projectMembers[projectId] || [];
  
  // Filter workspace members to those who are NOT already explicitly in the project
  const availableMembers = workspaceMembers.filter(
    (wm) => !currentProjectMembers.some((pm) => pm.userId === wm.userId)
  ).filter(
    (wm) => 
      wm.user.email.toLowerCase().includes(search.toLowerCase()) || 
      (wm.user.name && wm.user.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError("Please select a member");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      await assignProjectMember(projectId, selectedUserId);
      onClose();
      setSelectedUserId("");
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to assign member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#17191d] border border-white/[0.04] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            Assign Project Member
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search workspace members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-black/20 border border-white/[0.04] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {availableMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {search ? "No members found matching your search." : "All workspace members are already assigned to this project."}
                </div>
              ) : (
                availableMembers.map((member) => (
                  <label
                    key={member.userId}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUserId === member.userId
                        ? "bg-indigo-500/10 border-indigo-500/50"
                        : "bg-black/20 border-white/[0.04] hover:bg-white/[0.02] hover:border-white/[0.08]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="member"
                      value={member.userId}
                      checked={selectedUserId === member.userId}
                      onChange={() => setSelectedUserId(member.userId)}
                      className="hidden"
                    />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {(member.user.name ?? member.user.email).substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {member.user.name ?? "Unnamed User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.user.email}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.04]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedUserId}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign to Project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
