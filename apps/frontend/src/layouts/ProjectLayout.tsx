/**
 * src/layouts/ProjectLayout.tsx
 *
 * Project-level layout. Workspace data is already hydrated by the parent WorkspaceLayout.
 * The WorkspaceLayout provides the MainSidebar and Topbar shell.
 * This layout just acts as a pass-through (for now) to render the child route.
 */

import React, { useEffect, useState } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import ChatPanel from "../components/chat/ChatPanel";
import useChatStore from "../stores/chatStore";
import { useProjectStore } from "../stores/projectStore";
import { Lock } from "lucide-react";

export default function ProjectLayout(): React.ReactElement {
  const { projectId } = useParams<{ projectId: string }>();
  const isChatOpen = useChatStore(s => s.isChatOpen);
  const setChatOpen = useChatStore(s => s.setChatOpen);
  const navigate = useNavigate();
  const { projects, loading } = useProjectStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (projectId && !projects.find((p) => p.id === projectId)) {
        // Project not found in assigned projects list
        setIsChecking(false);
      } else {
        setIsChecking(false);
      }
    }
  }, [loading, projects, projectId]);

  if (loading || isChecking) {
    return <div className="p-8 text-[#A0AEC0]">Verifying access...</div>;
  }

  if (projectId && !projects.find((p) => p.id === projectId)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#121316]">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-[#A0AEC0] max-w-md mb-8">
          You don't have permission to view this project or it does not exist. 
          Please contact your workspace admin to request access.
        </p>
        <button
          onClick={() => navigate("..")}
          className="px-6 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      <Outlet />
      {projectId && (
        <ChatPanel
          projectId={projectId}
          isOpen={isChatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}
