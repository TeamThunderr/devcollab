import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Send, Smile, Reply, Edit2, Trash2, Sparkles, MoreHorizontal } from 'lucide-react';

import { useChat } from '../../hooks/useChat';
import useAuthStore from '../../stores/authStore';
import { formatMessageTime, formatDateSeparator, isSameGroup } from '../../lib/formatTime';
import EmojiPicker from './EmojiPicker';
import MentionPicker from './MentionPicker';
import api from '../../lib/axios';
import { usePresence } from '../../hooks/usePresence';
import CollaborativePresence from '../ui/CollaborativePresence';
import { cn } from '../../lib/utils';

interface ChatPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ projectId, isOpen, onClose }: ChatPanelProps): React.ReactElement {
  const { user } = useAuthStore();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { onlineUsers } = usePresence(workspaceId || '', projectId);
  
  const projectOnlineUsers = onlineUsers.filter(
    (u) => u.userId !== user?.id && u.projectId === projectId,
  );

  const [projectMembers, setProjectMembers] = useState<any[]>([]);

  const isViewer = React.useMemo(() => {
    if (!user) return true;
    const pm = projectMembers.find((m: any) => m.userId === user.id);
    if (pm) {
      if (pm.role === 'ADMIN' || pm.role === 'OWNER') return false;
      if (pm.role === 'VIEWER') return true;
    }
    return pm?.role === 'VIEWER';
  }, [user, projectMembers]);

  const {
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
  } = useChat(projectId);

  const [inputContent, setInputContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);

  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.get('/api/chat/' + projectId + '/members')
      .then(res => setProjectMembers(res.data.data || res.data))
      .catch(console.error);
  }, [projectId]);

  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom('auto');
    }
  }, [isOpen]);

  useEffect(() => {
    if (messages.length > 0) {
      const container = scrollContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
          scrollToBottom();
        }
      }
    }
  }, [messages]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop < 50 && hasMore && !isLoading) {
      loadMore();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      cancelEditOrReply();
    }
  };

  const cancelEditOrReply = () => {
    setReplyingTo(null);
    setEditingId(null);
    setInputContent('');
  };

  const handleSubmit = async () => {
    const trimmed = inputContent.trim();
    if (!trimmed) return;

    if (editingId) {
      await editMessage(editingId, trimmed);
      setEditingId(null);
    } else {
      await sendMessage(trimmed, replyingTo?.id);
      setReplyingTo(null);
    }
    setInputContent('');
    scrollToBottom();
  };

  const handleEditInit = (msg: any) => {
    setEditingId(msg.id);
    setInputContent(msg.content);
    setReplyingTo(null);
  };

  const renderMessageContent = (content: string) => {
    const parts = [];
    let lastIndex = 0;
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'mention', name: match[1], id: match[2] });
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return parts.map((part, i) => {
      if (part.type === 'mention') {
        return (
          <span key={i} className="text-[#A78BFA] font-medium cursor-pointer hover:underline">
            @{part.name}
          </span>
        );
      }
      
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return (part.content || '').split(urlRegex).map((subPart, j) => {
        if (subPart.match(urlRegex)) {
          return <a key={`${i}-${j}`} href={subPart} target="_blank" rel="noopener noreferrer" className="text-[#60A5FA] hover:underline break-all">{subPart}</a>;
        }
        return <span key={`${i}-${j}`} className="whitespace-pre-wrap">{subPart}</span>;
      });
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputContent(value);
    handleTyping();

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const query = textBeforeCursor.slice(atIndex + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        setMentionQuery(query);
        setMentionStartIndex(atIndex);
        setShowMentionPicker(true);
      } else {
        setShowMentionPicker(false);
      }
    } else {
      setShowMentionPicker(false);
    }
  };

  const handleMentionSelect = (member: { id: string; name: string }) => {
    const before = inputContent.slice(0, mentionStartIndex);
    const after = inputContent.slice(mentionStartIndex + mentionQuery.length + 1);
    const mention = '@[' + member.name + '](' + member.id + ')';
    const newValue = before + mention + ' ' + after;
    setInputContent(newValue);
    setShowMentionPicker(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed right-0 top-0 h-full w-full max-w-[400px] z-[100]
                       bg-[#0B1020]/95 backdrop-blur-2xl border-l border-[#1F2937]
                       shadow-[-24px_0_80px_rgba(0,0,0,0.6)] flex flex-col"
            role="dialog"
            aria-label="Project Chat"
          >
            {/* Header */}
            <div className="flex-shrink-0 h-14 border-b border-[#1F2937] px-5 flex items-center justify-between glass-topbar z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6]
                                flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[#F9FAFB] text-sm leading-tight">Project Chat</span>
                  <span className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5 font-medium">
                    {projectOnlineUsers.length > 0 ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                        </span>
                        {projectOnlineUsers.length} online
                      </>
                    ) : (
                      'Just you online'
                    )}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                  <CollaborativePresence 
                    users={projectOnlineUsers.map(u => ({ ...u, avatar: u.avatar || undefined, projectId: u.projectId || undefined }))}
                    max={3}
                  />
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center
                             bg-[#111827] border border-[#1F2937] text-[#9CA3AF]
                             hover:text-white hover:bg-[#1F2937] transition-all duration-200"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-5 flex flex-col gap-2 relative bg-[#0B1020]"
            >
              {isLoading && (
                <div className="text-center py-2 text-[11px] font-medium text-[#4B5563]">
                  Loading older messages...
                </div>
              )}
              
              {!isLoading && hasMore && messages.length > 0 && (
                <button 
                  onClick={() => loadMore()}
                  className="mx-auto my-2 px-3 py-1 rounded-full text-[11px] font-semibold text-[#7C3AED] bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 transition-colors"
                >
                  Load previous
                </button>
              )}

              {messages.length === 0 && !isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                  <div className="w-16 h-16 rounded-2xl bg-[#1F2937] flex items-center justify-center mb-4 relative">
                    <MessageSquare className="w-8 h-8 text-[#4B5563]" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#111827] flex items-center justify-center border border-[#1F2937]">
                      <Sparkles className="w-3 h-3 text-[#A78BFA]" />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#F9FAFB] mb-1">No messages yet</span>
                  <span className="text-xs text-[#9CA3AF]">Start the conversation with your team!</span>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = msg.senderId === user?.id;
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const isFirstInGroup = !prevMsg || !isSameGroup(prevMsg, msg);
                  const showDateDiv = !prevMsg || formatDateSeparator(prevMsg.createdAt) !== formatDateSeparator(msg.createdAt);

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateDiv && (
                        <div className="relative text-[10px] font-bold text-[#4B5563] text-center py-4 my-2 tracking-widest uppercase">
                          <span className="bg-[#0B1020] px-3 relative z-10">{formatDateSeparator(msg.createdAt)}</span>
                          <div className="absolute inset-0 flex items-center justify-center z-0">
                            <div className="w-full border-t border-[#1F2937]"></div>
                          </div>
                        </div>
                      )}
                      
                      <div 
                        className={cn(
                          'flex items-end gap-3 relative max-w-full',
                          isFirstInGroup ? 'mt-4' : 'mt-0.5',
                          isOwn ? 'justify-end' : ''
                        )}
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                        onMouseLeave={() => { setHoveredMessageId(null); setShowEmojiPickerFor(null); }}
                      >
                        {/* Left Avatar (for others) */}
                        {!isOwn && (
                          <div className="flex-shrink-0 w-8 flex justify-center">
                            {isFirstInGroup && (
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center shadow-md">
                                {msg.senderAvatar ? (
                                  <img src={msg.senderAvatar} className="w-full h-full rounded-xl object-cover" alt="" />
                                ) : (
                                  <span className="text-xs font-bold text-white">
                                    {msg.senderName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={cn('relative max-w-[80%]', isOwn && 'ml-auto')}>
                          
                          {/* Hover Actions */}
                          <AnimatePresence>
                            {hoveredMessageId === msg.id && msg.id !== 'temp-msg' && !msg.deletedAt && !isViewer && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                className={cn(
                                  'absolute -top-10 z-20 flex items-center gap-1 p-1 rounded-xl',
                                  'bg-[#1F2937] border border-[#374151] shadow-xl',
                                  isOwn ? 'right-0' : 'left-0'
                                )}
                              >
                                <button onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)} className="w-8 h-8 flex items-center justify-center hover:bg-[#374151] rounded-lg text-gray-300 hover:text-white transition-colors" title="React">
                                  <Smile className="w-4 h-4" />
                                </button>
                                <button onClick={() => setReplyingTo(msg)} className="w-8 h-8 flex items-center justify-center hover:bg-[#374151] rounded-lg text-gray-300 hover:text-white transition-colors" title="Reply">
                                  <Reply className="w-4 h-4" />
                                </button>
                                {isOwn && <button onClick={() => handleEditInit(msg)} className="w-8 h-8 flex items-center justify-center hover:bg-[#374151] rounded-lg text-gray-300 hover:text-white transition-colors" title="Edit">
                                  <Edit2 className="w-4 h-4" />
                                </button>}
                                {isOwn && <button onClick={() => { if(window.confirm('Delete message?')) deleteMessage(msg.id); }} className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded-lg text-gray-300 hover:text-red-400 transition-colors" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Emoji Picker Popup */}
                          <AnimatePresence>
                            {showEmojiPickerFor === msg.id && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={cn('absolute -top-24 z-30', isOwn ? 'right-0' : 'left-0')}
                              >
                                <EmojiPicker onSelect={(emoji) => { toggleReaction(msg.id, emoji); setShowEmojiPickerFor(null); }} />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className={cn(
                            'px-4 py-2.5 text-sm leading-relaxed break-words shadow-sm',
                            isOwn 
                              ? 'bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] text-white rounded-2xl rounded-tr-sm border border-[#8B5CF6]/30' 
                              : 'bg-[#111827] text-[#E5E7EB] rounded-2xl rounded-tl-sm border border-[#1F2937]',
                            msg.deletedAt && 'opacity-50 italic border-dashed'
                          )}>
                            {!isOwn && isFirstInGroup && (
                              <div className="text-[11px] font-bold text-[#A78BFA] mb-1 tracking-wide">
                                {msg.senderName}
                              </div>
                            )}

                            {msg.replyToId && (
                              <div className="bg-black/20 rounded-xl px-3 py-1.5 mb-2 border-l-2 border-[#A78BFA] flex flex-col gap-0.5 max-w-full">
                                <span className="text-[10px] font-bold text-[#A78BFA] flex items-center gap-1">
                                  <Reply className="w-3 h-3" />
                                  {msg.replySenderName}
                                </span>
                                <span className="text-xs text-[#D1D5DB] truncate">
                                  {msg.replyContent || 'Deleted message'}
                                </span>
                              </div>
                            )}

                            {msg.deletedAt ? (
                              <span className="flex items-center gap-2">
                                <Trash2 className="w-3 h-3" /> This message was deleted
                              </span>
                            ) : (
                              renderMessageContent(msg.content)
                            )}

                            <div className={cn(
                              'flex items-center gap-1 mt-1.5',
                              isOwn ? 'justify-end text-white/70' : 'justify-end text-[#9CA3AF]'
                            )}>
                              <span className="text-[9px] font-semibold tracking-wider">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                              {msg.editedAt && !msg.deletedAt && (
                                <span className="text-[9px] font-medium px-1 rounded-full bg-black/10">edited</span>
                              )}
                              {isOwn && msg.id === 'temp-msg' && (
                                <MoreHorizontal className="w-3 h-3 animate-pulse" />
                              )}
                            </div>
                          </div>

                          {/* Reactions */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className={cn('flex gap-1.5 flex-wrap mt-2', isOwn ? 'justify-end' : 'justify-start')}>
                              {msg.reactions.map(r => (
                                <button
                                  key={r.emoji}
                                  onClick={() => toggleReaction(msg.id, r.emoji)}
                                  className={cn(
                                    'px-2 py-0.5 rounded-full text-xs cursor-pointer shadow-sm flex items-center gap-1.5 transition-all duration-200 border',
                                    r.userReacted 
                                      ? 'bg-[#7C3AED]/20 border-[#7C3AED]/40 hover:bg-[#7C3AED]/30' 
                                      : 'bg-[#111827] border-[#1F2937] hover:bg-[#1F2937] hover:border-[#374151]'
                                  )}
                                >
                                  <span>{r.emoji}</span>
                                  <span className={cn('text-[10px] font-bold', r.userReacted ? 'text-[#A78BFA]' : 'text-[#9CA3AF]')}>{r.count}</span>
                                </button>
                              ))}
                            </div>
                          )}

                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            <div className="px-5 py-1.5 h-8 flex-shrink-0 bg-[#0B1020]">
              <AnimatePresence>
                {typingUsers.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-[11px] font-medium text-[#9CA3AF] flex items-center gap-2"
                  >
                    <div className="flex items-center gap-1 bg-[#1F2937] px-2 py-1 rounded-full">
                      <span className="w-1 h-1 bg-[#A78BFA] rounded-full animate-bounce" />
                      <span className="w-1 h-1 bg-[#A78BFA] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-[#A78BFA] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    {typingUsers.length === 1 
                      ? `${typingUsers[0].name} is typing...`
                      : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 border-t border-[#1F2937] bg-[#111827] p-4 flex flex-col z-20 glass-topbar">
              
              <AnimatePresence>
                {editingId && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[#7C3AED]/10 text-[#A78BFA] border border-[#7C3AED]/20 text-[11px] font-bold px-3 py-2 rounded-t-xl flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" /> Editing message
                      </div>
                      <button onClick={cancelEditOrReply} className="hover:text-white transition-colors p-0.5 rounded-full hover:bg-[#7C3AED]/20"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {replyingTo && !editingId && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[#1F2937] border-t border-x border-[#374151] px-4 py-2.5 rounded-t-xl flex items-center gap-3 mb-1.5 relative">
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#7C3AED] rounded-r-full"></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-[#A78BFA] font-bold uppercase tracking-wider truncate mb-0.5 flex items-center gap-1.5">
                          <Reply className="w-3 h-3" /> Replying to {replyingTo.senderName}
                        </div>
                        <div className="text-xs text-[#D1D5DB] truncate">{replyingTo.content}</div>
                      </div>
                      <button onClick={cancelEditOrReply} className="text-[#9CA3AF] hover:text-white transition-colors p-1 rounded-full hover:bg-[#374151]"><X className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={cn(
                'relative bg-[#0F1629] border border-[#1F2937] rounded-2xl flex items-end gap-2 px-3 py-2',
                'focus-within:border-[#7C3AED]/50 focus-within:shadow-[0_0_12px_rgba(124,58,237,0.15)] transition-all duration-200'
              )}>
                {showMentionPicker && (
                  <MentionPicker
                    members={projectMembers}
                    query={mentionQuery}
                    onSelect={handleMentionSelect}
                    onClose={() => setShowMentionPicker(false)}
                  />
                )}
                <textarea
                  ref={(el) => {
                    (inputRef as any).current = el;
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                    }
                  }}
                  value={inputContent}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={isViewer}
                  placeholder={isViewer ? "Chat locked (Read-only)" : "Message #project-chat..."}
                  className="flex-1 bg-transparent text-sm text-[#F9FAFB] placeholder-[#4B5563] resize-none outline-none min-h-[24px] max-h-[140px] py-1 disabled:opacity-50 disabled:cursor-not-allowed premium-scrollbar"
                  rows={1}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!inputContent.trim() || isViewer}
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200',
                    inputContent.trim() && !isViewer 
                      ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-violet-500/20 hover:scale-105 hover:-translate-y-0.5' 
                      : 'bg-[#1F2937] text-[#4B5563] cursor-not-allowed'
                  )}
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
