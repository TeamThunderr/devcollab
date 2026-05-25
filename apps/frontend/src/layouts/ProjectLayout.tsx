import React from "react";
import { Outlet, useParams } from "react-router-dom";
import ChatPanel from "../components/chat/ChatPanel";
import useChatStore from "../stores/chatStore";

export default function ProjectLayout(): React.ReactElement {
  const { projectId } = useParams<{ projectId: string }>();
  const isChatOpen = useChatStore(s => s.isChatOpen);
  const setChatOpen = useChatStore(s => s.setChatOpen);

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
