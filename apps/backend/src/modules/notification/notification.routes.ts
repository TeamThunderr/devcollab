import { FastifyPluginAsync } from 'fastify';
import { notificationController } from './notification.controller';
import { verifyAuth } from '../../middleware/auth.middleware';

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // All notification routes require authentication
  fastify.addHook('preHandler', verifyAuth);

  fastify.post('/', notificationController.createNotification as any);
  fastify.get('/', notificationController.getNotifications as any);
  fastify.get('/unread-count', notificationController.getUnreadCount as any);
  fastify.patch('/:id/read', notificationController.markAsRead as any);
  fastify.patch('/read-all', notificationController.markAllAsRead as any);
};

export default notificationRoutes;
