import { create } from 'zustand';

export interface MessageReaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export interface Message {
  id: string;
  projectId: string;
  content: string;
  type: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  replyToId: string | null;
  replyContent: string | null;
  replySenderName: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  reactions: MessageReaction[];
}

export interface ChatStore {
  messages: Record<string, Message[]>; // keyed by projectId
  unreadCounts: Record<string, number>;
  typingUsers: Record<string, { userId: string; name: string }[]>;
  isLoading: boolean;
  hasMore: Record<string, boolean>;
  isChatOpen: boolean;

  setMessages: (projectId: string, messages: Message[]) => void;
  prependMessages: (projectId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, content: string, editedAt: string) => void;
  deleteMessage: (messageId: string) => void;
  updateReaction: (messageId: string, emoji: string, userReacted: boolean, userId: string, currentUserId: string) => void;
  setTyping: (projectId: string, user: { userId: string; name: string }) => void;
  removeTyping: (projectId: string, userId: string) => void;
  setUnread: (projectId: string, count: number) => void;
  clearUnread: (projectId: string) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (projectId: string, hasMore: boolean) => void;
  setChatOpen: (isOpen: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: {},
  unreadCounts: {},
  typingUsers: {},
  isLoading: false,
  hasMore: {},
  isChatOpen: false,

  setMessages: (projectId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [projectId]: messages },
    })),

  prependMessages: (projectId, olderMessages) =>
    set((state) => {
      const current = state.messages[projectId] || [];
      return {
        messages: { ...state.messages, [projectId]: [...olderMessages, ...current] },
      };
    }),

  addMessage: (message) =>
    set((state) => {
      const projectId = message.projectId;
      const current = state.messages[projectId] || [];
      // Remove temp message if it exists
      const filtered = current.filter((m) => m.id !== 'temp-msg');
      // If we already have this message (e.g. from optimistic update being replaced), replace it
      const existingIdx = filtered.findIndex((m) => m.id === message.id);
      if (existingIdx !== -1) {
        filtered[existingIdx] = message;
        return { messages: { ...state.messages, [projectId]: [...filtered] } };
      }
      return {
        messages: { ...state.messages, [projectId]: [...filtered, message] },
      };
    }),

  updateMessage: (messageId, content, editedAt) =>
    set((state) => {
      const newMessages = { ...state.messages };
      for (const projectId in newMessages) {
        const msgs = newMessages[projectId];
        const idx = msgs.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          newMessages[projectId] = [...msgs];
          newMessages[projectId][idx] = {
            ...newMessages[projectId][idx],
            content,
            editedAt,
          };
          break;
        }
      }
      return { messages: newMessages };
    }),

  deleteMessage: (messageId) =>
    set((state) => {
      const newMessages = { ...state.messages };
      for (const projectId in newMessages) {
        const msgs = newMessages[projectId];
        const idx = msgs.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          newMessages[projectId] = [...msgs];
          newMessages[projectId][idx] = {
            ...newMessages[projectId][idx],
            deletedAt: new Date().toISOString(),
          };
          break;
        }
      }
      return { messages: newMessages };
    }),

  updateReaction: (messageId, emoji, userReacted, userId, currentUserId) =>
    set((state) => {
      const newMessages = { ...state.messages };
      for (const projectId in newMessages) {
        const msgs = newMessages[projectId];
        const idx = msgs.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          const msg = newMessages[projectId][idx];
          const reactions = [...(msg.reactions || [])];
          const rIdx = reactions.findIndex((r) => r.emoji === emoji);

          // We received a broadcast about a reaction from `userId`.
          // We only toggle `userReacted` state if it was our own action.
          // Otherwise, we just increment/decrement the count.
          
          if (rIdx !== -1) {
            let r = { ...reactions[rIdx] };
            if (userId === currentUserId) {
              // It's our own event
              r.userReacted = userReacted;
              // If we just reacted, count++, else count--
              r.count = userReacted ? r.count + 1 : r.count - 1;
            } else {
              // Someone else did it
              r.count = userReacted ? r.count + 1 : r.count - 1;
            }
            
            if (r.count <= 0) {
              reactions.splice(rIdx, 1);
            } else {
              reactions[rIdx] = r;
            }
          } else {
            // New emoji reaction
            if (userReacted) {
              reactions.push({ emoji, count: 1, userReacted: userId === currentUserId });
            }
          }

          newMessages[projectId] = [...msgs];
          newMessages[projectId][idx] = { ...msg, reactions };
          break;
        }
      }
      return { messages: newMessages };
    }),

  setTyping: (projectId, user) =>
    set((state) => {
      const current = state.typingUsers[projectId] || [];
      if (!current.find((u) => u.userId === user.userId)) {
        return {
          typingUsers: { ...state.typingUsers, [projectId]: [...current, user] },
        };
      }
      return state;
    }),

  removeTyping: (projectId, userId) =>
    set((state) => {
      const current = state.typingUsers[projectId] || [];
      return {
        typingUsers: {
          ...state.typingUsers,
          [projectId]: current.filter((u) => u.userId !== userId),
        },
      };
    }),

  setUnread: (projectId, count) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [projectId]: count },
    })),

  clearUnread: (projectId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [projectId]: 0 },
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setHasMore: (projectId, hasMore) =>
    set((state) => ({
      hasMore: { ...state.hasMore, [projectId]: hasMore },
    })),

  setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
}));

export default useChatStore;
