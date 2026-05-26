import { useEffect } from "react";
import { socket } from "../lib/socket";
import { useSnippetStore, Snippet } from "../stores/snippetStore";

export function useSnippetSync(projectId: string | undefined): void {
  const addSnippet = useSnippetStore((s) => s.addSnippetState);
  const updateSnippet = useSnippetStore((s) => s.updateSnippetState);
  const deleteSnippet = useSnippetStore((s) => s.deleteSnippetState);

  useEffect(() => {
    if (!projectId) return;

    // Join the project room so the server starts sending snippet events
    socket.emit("join:project", { projectId });

    const onSnippetCreated = (data: unknown) => {
      addSnippet(data as Snippet);
    };

    const onSnippetUpdated = (data: unknown) => {
      const snip = data as Snippet;
      updateSnippet(snip.id, snip);
    };

    const onSnippetDeleted = (data: unknown) => {
      const { snippetId } = data as { snippetId: string };
      deleteSnippet(snippetId);
    };

    socket.on("snippet:created", onSnippetCreated);
    socket.on("snippet:updated", onSnippetUpdated);
    socket.on("snippet:deleted", onSnippetDeleted);

    return () => {
      socket.off("snippet:created", onSnippetCreated);
      socket.off("snippet:updated", onSnippetUpdated);
      socket.off("snippet:deleted", onSnippetDeleted);
    };
  }, [projectId, addSnippet, updateSnippet, deleteSnippet]);
}
