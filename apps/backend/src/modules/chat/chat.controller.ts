import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../../db/client';
import { redis } from '../../redis/client';
import { AppError } from '../../utils/errors';
import { io } from '../../socket/socket';
import { emitChatMessage } from '../../socket/handlers/chat.handler'; // IDE refresh

export const getMessages = async (
  request: FastifyRequest<{
    Params: { projectId: string };
    Querystring: { before?: string; limit?: string };
  }>,
  reply: FastifyReply
) => {
  const { projectId } = request.params;
  const before = request.query.before;
  const limit = parseInt(request.query.limit || '50', 10);
  const userId = request.user!.userId;

  // Update last seen
  try {
    if (redis) {
      await redis.set(`chat:seen:${projectId}:${userId}`, new Date().toISOString());
    }
  } catch (err) {
    console.warn('Redis set failed', err);
  }

  const result = await query(
    `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar,
            u.id as sender_id,
            reply.content as reply_content,
            reply_user.name as reply_sender_name
     FROM messages m
     JOIN users u ON m.user_id = u.id
     LEFT JOIN messages reply ON m.reply_to_id = reply.id
     LEFT JOIN users reply_user ON reply.user_id = reply_user.id
     WHERE m.project_id = $1 
       AND m.deleted_at IS NULL
       AND ($2::timestamptz IS NULL OR m.created_at < $2::timestamptz)
     ORDER BY m.created_at DESC
     LIMIT $3`,
    [projectId, before || null, limit]
  );

  // Get reactions for these messages
  const messageIds = result.rows.map((row) => row.id);
  const reactionsByMessage = new Map<string, any[]>();

  if (messageIds.length > 0) {
    const reactions = await query(
      `SELECT message_id, emoji, COUNT(*) as count,
              bool_or(user_id = $1) as user_reacted
       FROM message_reactions
       WHERE message_id = ANY($2::uuid[])
       GROUP BY message_id, emoji`,
      [userId, messageIds]
    );

    for (const r of reactions.rows) {
      if (!reactionsByMessage.has(r.message_id)) {
        reactionsByMessage.set(r.message_id, []);
      }
      reactionsByMessage.get(r.message_id)!.push({
        emoji: r.emoji,
        count: parseInt(r.count, 10),
        userReacted: r.user_reacted
      });
    }
  }

  const messages = result.rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    content: row.content,
    type: row.type,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    replyToId: row.reply_to_id,
    replyContent: row.reply_content,
    replySenderName: row.reply_sender_name,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    reactions: reactionsByMessage.get(row.id) || []
  }));

  // Return ascending for display
  return reply.send(messages.reverse());
};

export const sendMessage = async (
  request: FastifyRequest<{
    Params: { projectId: string };
    Body: { content: string; replyToId?: string };
  }>,
  reply: FastifyReply
) => {
  const { projectId } = request.params;
  const { content, replyToId } = request.body;
  const userId = request.user!.userId;

  if (!content || content.length < 1 || content.length > 4000) {
    throw new AppError(400, 'Content must be between 1 and 4000 characters');
  }

  const senderRes = await query(`SELECT name FROM users WHERE id = $1`, [userId]);
  const senderName = senderRes.rows[0]?.name || 'Someone';

  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  const mentionedUserIds: string[] = [];

  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionedName = match[1];
    const mentionedUserId = match[2];
    mentionedUserIds.push(mentionedUserId);

    const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content;
    const bodyStr = `${senderName} mentioned you in project chat: ${messagePreview}`;

    const notifRes = await query(
      `INSERT INTO notifications (user_id, type, title, body, related_task_id)
       VALUES ($1, 'mention', 'New mention in chat', $2, NULL)
       RETURNING id, created_at`,
      [mentionedUserId, bodyStr]
    );

    const notificationId = notifRes.rows[0].id;
    const createdAt = notifRes.rows[0].created_at;

    io.to('user:' + mentionedUserId).emit('notification:new', {
      id: notificationId,
      userId: mentionedUserId,
      type: 'mention',
      message: 'New mention in chat',
      body: bodyStr,
      metadata: {},
      readAt: null,
      createdAt: new Date(createdAt).toISOString()
    });
  }

  const insertResult = await query(
    `INSERT INTO messages (project_id, user_id, content, reply_to_id, mentions)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at, type`,
    [projectId, userId, content, replyToId || null, mentionedUserIds]
  );
  
  const newId = insertResult.rows[0].id;

  // Re-fetch to get all joins formatted exactly like getMessages
  const msgResult = await query(
    `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar,
            u.id as sender_id,
            reply.content as reply_content,
            reply_user.name as reply_sender_name
     FROM messages m
     JOIN users u ON m.user_id = u.id
     LEFT JOIN messages reply ON m.reply_to_id = reply.id
     LEFT JOIN users reply_user ON reply.user_id = reply_user.id
     WHERE m.id = $1`,
    [newId]
  );

  const row = msgResult.rows[0];
  const messageWithSenderInfo = {
    id: row.id,
    projectId: row.project_id,
    content: row.content,
    type: row.type,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    replyToId: row.reply_to_id,
    replyContent: row.reply_content,
    replySenderName: row.reply_sender_name,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    reactions: []
  };

  emitChatMessage(io, projectId, 'message:new', messageWithSenderInfo);
  return reply.status(201).send(messageWithSenderInfo);
};

export const editMessage = async (
  request: FastifyRequest<{
    Params: { projectId: string; messageId: string };
    Body: { content: string };
  }>,
  reply: FastifyReply
) => {
  const { projectId, messageId } = request.params;
  const { content } = request.body;
  const userId = request.user!.userId;

  if (!content || content.length < 1 || content.length > 4000) {
    throw new AppError(400, 'Content must be between 1 and 4000 characters');
  }

  const result = await query(
    `UPDATE messages 
     SET content = $1, edited_at = NOW() 
     WHERE id = $2 AND user_id = $3 AND project_id = $4 AND deleted_at IS NULL
     RETURNING id, edited_at, content`,
    [content, messageId, userId, projectId]
  );

  if (result.rowCount === 0) {
    throw new AppError(403, 'Message not found or you are not the owner');
  }

  const updatedMsg = result.rows[0];

  emitChatMessage(io, projectId, 'message:edited', {
    id: updatedMsg.id,
    content: updatedMsg.content,
    editedAt: updatedMsg.edited_at
  });

  return reply.send({ success: true, editedAt: updatedMsg.edited_at });
};

export const deleteMessage = async (
  request: FastifyRequest<{
    Params: { projectId: string; messageId: string };
  }>,
  reply: FastifyReply
) => {
  const { projectId, messageId } = request.params;
  const userId = request.user!.userId;

  // Simple owner check for now (add project admin check later if needed via RBAC)
  const result = await query(
    `UPDATE messages 
     SET deleted_at = NOW() 
     WHERE id = $1 AND user_id = $2 AND project_id = $3 AND deleted_at IS NULL
     RETURNING id, deleted_at`,
    [messageId, userId, projectId]
  );

  if (result.rowCount === 0) {
    throw new AppError(403, 'Message not found or you are not the owner');
  }

  emitChatMessage(io, projectId, 'message:deleted', { id: messageId });
  return reply.send({ success: true });
};

export const toggleReaction = async (
  request: FastifyRequest<{
    Params: { projectId: string; messageId: string };
    Body: { emoji: string };
  }>,
  reply: FastifyReply
) => {
  const { projectId, messageId } = request.params;
  const { emoji } = request.body;
  const userId = request.user!.userId;

  // Verify message exists in this project
  const msgCheck = await query(`SELECT id FROM messages WHERE id = $1 AND project_id = $2`, [messageId, projectId]);
  if (msgCheck.rowCount === 0) {
    throw new AppError(404, 'Message not found');
  }

  // Toggle reaction
  const existing = await query(
    `SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
    [messageId, userId, emoji]
  );

  let userReacted = false;
  if (existing && existing.rowCount !== null && existing.rowCount > 0) {
    await query(`DELETE FROM message_reactions WHERE id = $1`, [existing.rows[0].id]);
    userReacted = false;
  } else {
    await query(
      `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)`,
      [messageId, userId, emoji]
    );
    userReacted = true;
  }

  emitChatMessage(io, projectId, 'message:reaction', {
    id: messageId,
    emoji,
    userReacted, // Note: The broadcast receiver will toggle their own state based on their own userId locally, but we send it for the initiator
    userId // Let clients know who reacted to properly update counts
  });

  return reply.send({ success: true, userReacted });
};

export const getUnreadCount = async (
  request: FastifyRequest<{
    Params: { projectId: string };
  }>,
  reply: FastifyReply
) => {
  const { projectId } = request.params;
  const userId = request.user!.userId;

  let count = 0;
  try {
    if (redis) {
      const lastSeen = await redis.get(`chat:seen:${projectId}:${userId}`);
      if (lastSeen) {
        const result = await query(
          `SELECT COUNT(*) as count FROM messages WHERE project_id = $1 AND created_at > $2::timestamptz`,
          [projectId, lastSeen]
        );
        count = parseInt(result.rows[0].count, 10);
      }
    }
  } catch (err) {
    console.warn('Redis get failed', err);
  }

  return reply.send({ count });
};

export const markSeen = async (
  request: FastifyRequest<{
    Params: { projectId: string };
  }>,
  reply: FastifyReply
) => {
  const { projectId } = request.params;
  const userId = request.user!.userId;

  try {
    if (redis) {
      await redis.set(`chat:seen:${projectId}:${userId}`, new Date().toISOString());
    }
  } catch (err) {
    console.warn('Redis set failed', err);
  }
  return reply.send({ success: true });
};

export const getProjectMembers = async (
  request: FastifyRequest<{ Params: { projectId: string } }>,
  reply: FastifyReply
) => {
  const { projectId } = request.params;

  const result = await query(
    `SELECT u.id, u.name, u.avatar_url
     FROM project_members pm
     JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = $1
     ORDER BY u.name ASC`,
    [projectId]
  );

  return reply.send(result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url
  })));
};
