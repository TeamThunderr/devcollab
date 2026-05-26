import { useEffect, useRef, useCallback } from 'react';
import useChatStore from '../stores/chatStore';
import useAuthStore from '../stores/authStore';
import { socket } from '../lib/socket';
import api from '../lib/axios';

export function useChat(projectId: string) {
  const { user } = useAuthStore();
  const store = useChatStore();

  const messages = store.messages[projectId] || [];
  const typingUsers = store.typingUsers[projectId] || [];
  const hasMore = store.hasMore[projectId] ?? true;
  const isLoading = store.isLoading;

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!projectId) return;

    const fetchInitial = async () => {
      try {
        store.setLoading(true);
        const res = await api.get(`/api/chat/${projectId}/messages?limit=50`);
        store.setMessages(projectId, res.data);
        if (res.data.length < 50) {
          store.setHasMore(projectId, false);
        }
      } catch (err) {
        console.error('Failed to fetch initial chat messages', err);
      } finally {
        store.setLoading(false);
      }
    };

    fetchInitial();

    // Join the chat room. Emit immediately if the socket is already connected;
    // otherwise re-emit once the socket handshake completes.
    const joinRoom = () => socket.emit('chat:join', { projectId });
    if (socket.connected) {
      joinRoom();
    }
    socket.on('connect', joinRoom);

    const onNewMessage = (msg: any) => {
      store.addMessage(msg);
      // Marking as seen if we are receiving this
      api.post(`/api/chat/${projectId}/seen`).catch(() => {});
    };

    const onMessageEdited = (data: { id: string; content: string; editedAt: string }) => {
      store.updateMessage(data.id, data.content, data.editedAt);
    };

    const onMessageDeleted = (data: { id: string }) => {
      store.deleteMessage(data.id);
    };

    const onMessageReaction = (data: { id: string; emoji: string; userReacted: boolean; userId: string }) => {
      if (!user) return;
      store.updateReaction(data.id, data.emoji, data.userReacted, data.userId, user.id);
    };

    const onChatTyping = (data: { userId: string; name: string }) => {
      store.setTyping(projectId, data);
      // Auto remove after 3s
      setTimeout(() => {
        store.removeTyping(projectId, data.userId);
      }, 3000);
    };

    const onChatStopTyping = (data: { userId: string }) => {
      store.removeTyping(projectId, data.userId);
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:edited', onMessageEdited);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('message:reaction', onMessageReaction);
    socket.on('chat:typing', onChatTyping);
    socket.on('chat:stop-typing', onChatStopTyping);

    return () => {
      socket.off('connect', joinRoom);
      socket.emit('chat:leave', { projectId });
      socket.off('message:new', onNewMessage);
      socket.off('message:edited', onMessageEdited);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('message:reaction', onMessageReaction);
      socket.off('chat:typing', onChatTyping);
      socket.off('chat:stop-typing', onChatStopTyping);
    };
  }, [projectId, user]);

  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!user) return;
    const tempMsg = {
      id: 'temp-msg',
      projectId,
      content,
      type: 'text',
      senderId: user.id,
      senderName: user.name || user.email,
      senderAvatar: user.avatar || null,
      replyToId: replyToId || null,
      replyContent: null,
      replySenderName: null,
      editedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      reactions: []
    };

    store.addMessage(tempMsg);

    try {
      await api.post(`/api/chat/${projectId}/messages`, { content, replyToId });
      // addMessage handles replacing temp message by checking existing id logic, 
      // but since the server returns a real id, the temp-msg will be filtered out 
      // and the real one added.
    } catch (err) {
      console.error('Failed to send message', err);
      store.deleteMessage('temp-msg');
    }
  }, [projectId, user]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await api.put(`/api/chat/${projectId}/messages/${messageId}`, { content });
    } catch (err) {
      console.error('Failed to edit message', err);
    }
  }, [projectId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await api.delete(`/api/chat/${projectId}/messages/${messageId}`);
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  }, [projectId]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await api.post(`/api/chat/${projectId}/messages/${messageId}/reactions`, { emoji });
    } catch (err) {
      console.error('Failed to toggle reaction', err);
    }
  }, [projectId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || messages.length === 0) return;

    try {
      store.setLoading(true);
      const oldestMsg = messages[0];
      const res = await api.get(`/api/chat/${projectId}/messages?before=${encodeURIComponent(oldestMsg.createdAt)}&limit=50`);
      
      store.prependMessages(projectId, res.data);
      if (res.data.length < 50) {
        store.setHasMore(projectId, false);
      }
    } catch (err) {
      console.error('Failed to load more messages', err);
    } finally {
      store.setLoading(false);
    }
  }, [projectId, hasMore, isLoading, messages]);

  const handleTyping = useCallback(() => {
    socket.emit('chat:typing', { projectId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:stop-typing', { projectId });
    }, 2000);
  }, [projectId]);

  return {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    loadMore,
    hasMore,
    isLoading,
    typingUsers,
    handleTyping
  };
}
