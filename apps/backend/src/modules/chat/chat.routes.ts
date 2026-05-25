import { FastifyInstance } from 'fastify';
import { verifyAuth } from '../../middleware/auth.middleware';
import { verifyProjectAccess } from '../../middleware/rbac.middleware';
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  getUnreadCount,
  markSeen,
  getProjectMembers
} from './chat.controller'; // IDE refresh

export default async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', verifyAuth);
  fastify.addHook('preHandler', verifyProjectAccess);

  fastify.get('/:projectId/messages', getMessages);
  fastify.post('/:projectId/messages', sendMessage);
  fastify.put('/:projectId/messages/:messageId', editMessage);
  fastify.delete('/:projectId/messages/:messageId', deleteMessage);
  fastify.post('/:projectId/messages/:messageId/reactions', toggleReaction);
  
  fastify.get('/:projectId/unread', getUnreadCount);
  fastify.post('/:projectId/seen', markSeen);
  
  fastify.get('/:projectId/members', getProjectMembers);
}
