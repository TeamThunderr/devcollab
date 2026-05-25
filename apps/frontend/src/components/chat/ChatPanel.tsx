import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import useAuthStore from '../../stores/authStore';
import { formatMessageTime, formatDateSeparator, isSameGroup } from '../../lib/formatTime';
import EmojiPicker from './EmojiPicker';
import MentionPicker from './MentionPicker';
import api from '../../lib/axios';
import { useParams } from 'react-router-dom';
import { usePresence } from '../../hooks/usePresence';
import OnlineAvatars from '../presence/OnlineAvatars';

interface ChatPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ projectId, isOpen, onClose }: ChatPanelProps): React.ReactElement {
  const { user } = useAuthStore();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { onlineUsers } = usePresence(workspaceId || '', projectId);
  
  const othersOnline = onlineUsers.filter(u => u.userId !== user?.id);

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
  const [projectMembers, setProjectMembers] = useState([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.get('/api/chat/' + projectId + '/members')
      .then(res => setProjectMembers(res.data.data || res.data))
      .catch(console.error);
  }, [projectId]);

  // Auto-scroll logic
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
      // If user is near bottom, auto-scroll to new message
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
          <span key={i} className="text-blue-400 font-medium cursor-pointer hover:underline">
            @{part.name}
          </span>
        );
      }
      
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return (part.content || '').split(urlRegex).map((subPart, j) => {
        if (subPart.match(urlRegex)) {
          return <a key={`${i}-${j}`} href={subPart} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline break-all">{subPart}</a>;
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

  if (!isOpen) return <></>;

  return (
    <div className="fixed right-0 top-0 h-full w-full sm:w-80 bg-gray-950 border-l border-gray-800 flex flex-col z-40 transform transition-transform duration-300 ease-in-out">
      <div className="flex-shrink-0 h-14 border-b border-gray-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <div className="flex flex-col">
            <span className="font-medium text-white text-sm">Project Chat</span>
            <span className="text-xs text-gray-500 flex items-center gap-1.5">
              {othersOnline.length > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse ring-1 ring-gray-950"></span>
                  {othersOnline.length} active
                </>
              ) : (
                'Just you'
              )}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {workspaceId && <OnlineAvatars workspaceId={workspaceId} projectId={projectId} size="sm" />}
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 relative"
      >
        {isLoading && (
          <div className="text-center py-2 text-xs text-gray-500">Loading older messages...</div>
        )}
        
        {!isLoading && hasMore && messages.length > 0 && (
          <div 
            onClick={() => loadMore()}
            className="text-xs text-blue-400 cursor-pointer text-center py-2 hover:text-blue-300"
          >
            Load older messages
          </div>
        )}

        {messages.length === 0 && !isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <svg className="w-12 h-12 text-gray-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <span className="text-sm text-gray-500">No messages yet</span>
            <span className="text-xs text-gray-600 mt-1">Start the conversation!</span>
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
                  <div className="relative text-xs text-gray-600 text-center py-2 my-2">
                    <span className="bg-gray-950 px-2 relative z-10">{formatDateSeparator(msg.createdAt)}</span>
                    <div className="absolute inset-0 flex items-center justify-center z-0">
                      <div className="w-full border-t border-gray-800"></div>
                    </div>
                  </div>
                )}
                
                <div 
                  className={`flex items-end gap-2 px-2 py-0.5 relative ${isFirstInGroup ? 'mt-2' : ''} ${isOwn ? 'justify-end' : ''}`}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => { setHoveredMessageId(null); setShowEmojiPickerFor(null); }}
                >
                  {/* Left Avatar (for others) */}
                  {!isOwn && (
                    <div className="flex-shrink-0 w-7">
                      {isFirstInGroup && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs text-white uppercase font-bold">
                          {msg.senderAvatar ? <img src={msg.senderAvatar} className="w-full h-full rounded-full object-cover" alt="" /> : msg.senderName.charAt(0)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`relative max-w-[80%] ${isOwn ? 'ml-auto' : ''}`}>
                    
                    {/* Hover Actions */}
                    {hoveredMessageId === msg.id && msg.id !== 'temp-msg' && !msg.deletedAt && (
                      <div className={`absolute -top-8 ${isOwn ? 'right-0' : 'left-0'} bg-gray-900 border border-gray-700 rounded-xl flex items-center gap-1 px-1 py-1 shadow-lg z-20`}>
                        <button onClick={() => setShowEmojiPickerFor(showEmojiPickerFor === msg.id ? null : msg.id)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-800 rounded-lg text-sm" title="React">😊</button>
                        <button onClick={() => setReplyingTo(msg)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-800 rounded-lg text-sm" title="Reply">↩</button>
                        {isOwn && <button onClick={() => handleEditInit(msg)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-800 rounded-lg text-sm" title="Edit">✏️</button>}
                        {isOwn && <button onClick={() => { if(window.confirm('Delete message?')) deleteMessage(msg.id); }} className="w-7 h-7 flex items-center justify-center hover:bg-gray-800 rounded-lg text-sm" title="Delete">🗑️</button>}
                      </div>
                    )}

                    {/* Emoji Picker Popup */}
                    {showEmojiPickerFor === msg.id && (
                      <div className={`absolute -top-20 ${isOwn ? 'right-0' : 'left-0'} z-30`}>
                        <EmojiPicker onSelect={(emoji) => { toggleReaction(msg.id, emoji); setShowEmojiPickerFor(null); }} />
                      </div>
                    )}

                    <div className={`px-3 py-2 text-sm leading-relaxed break-words shadow-sm
                      ${isOwn ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm'}
                      ${msg.deletedAt ? 'opacity-50 italic' : ''}
                    `}>
                      {!isOwn && isFirstInGroup && (
                        <div className="text-xs font-medium text-blue-400 mb-1">{msg.senderName}</div>
                      )}

                      {msg.replyToId && (
                        <div className="bg-black/20 rounded-lg px-2 py-1 mb-1 border-l-2 border-blue-400 text-xs text-gray-300 truncate max-w-full">
                          ↩ {msg.replySenderName}: {msg.replyContent || 'Deleted message'}
                        </div>
                      )}

                      {msg.deletedAt ? (
                        <span>This message was deleted.</span>
                      ) : (
                        renderMessageContent(msg.content)
                      )}

                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <span className="text-[10px] opacity-60">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                        {msg.editedAt && !msg.deletedAt && (
                          <span className="text-[10px] opacity-50">• edited</span>
                        )}
                        {isOwn && msg.id === 'temp-msg' && (
                          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                      </div>
                    </div>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex gap-1 flex-wrap mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {msg.reactions.map(r => (
                          <button
                            key={r.emoji}
                            onClick={() => toggleReaction(msg.id, r.emoji)}
                            className={`px-2 py-0.5 rounded-full text-xs cursor-pointer shadow-sm flex items-center gap-1 transition-colors
                              ${r.userReacted ? 'bg-gray-800 ring-1 ring-blue-500 hover:bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'}
                            `}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-gray-400">{r.count}</span>
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
      <div className="px-4 py-1 h-6 flex-shrink-0">
        {typingUsers.length > 0 && (
          <div className="text-xs text-gray-500 italic flex items-center">
            {typingUsers.length === 1 
              ? `${typingUsers[0].name} is typing`
              : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing`}
            <span className="inline-flex mx-0.5 animate-bounce">.</span>
            <span className="inline-flex mx-0.5 animate-bounce delay-75">.</span>
            <span className="inline-flex mx-0.5 animate-bounce delay-150">.</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-950 p-3 flex flex-col">
        
        {editingId && (
          <div className="bg-blue-950 text-blue-300 text-xs px-3 py-1.5 rounded-t-lg flex items-center justify-between mb-1">
            <span>Editing message</span>
            <button onClick={cancelEditOrReply} className="hover:text-white text-lg leading-none">&times;</button>
          </div>
        )}

        {replyingTo && !editingId && (
          <div className="bg-gray-900 border-t border-x border-gray-800 px-3 py-2 rounded-t-lg flex items-center gap-3 mb-1">
            <div className="w-0.5 h-6 bg-blue-500 rounded-full"></div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-blue-400 font-medium truncate">Replying to {replyingTo.senderName}</div>
              <div className="text-xs text-gray-400 truncate">{replyingTo.content}</div>
            </div>
            <button onClick={cancelEditOrReply} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
          </div>
        )}

        <div className="relative bg-gray-900 border border-gray-700 rounded-2xl flex items-end gap-2 px-3 py-2 focus-within:border-blue-500 transition-colors">
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
              // Merge refs for inputRef and the dynamic height logic
              (inputRef as any).current = el;
              if (el) {
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }
            }}
            value={inputContent}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message #project-chat"
            className="flex-1 bg-transparent text-sm text-white resize-none outline-none min-h-[20px] max-h-[120px] py-0.5"
            rows={1}
          />
          <button
            onClick={handleSubmit}
            disabled={!inputContent.trim()}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
              ${inputContent.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}
            `}
          >
            <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
