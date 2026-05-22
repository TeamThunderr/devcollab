import { FastifyRequest, FastifyReply } from 'fastify';
import { notificationService } from './notification.service';
import { getNotificationsSchema } from './notification.schema';

export const notificationController = {
  async getNotifications(request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) {
    try {
      const filters = getNotificationsSchema.parse(request.query);
      const feed = await notificationService.getNotifications(request.user!.userId, filters);
      return reply.send(feed);
    } catch (error: any) {
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async getUnreadCount(request: FastifyRequest, reply: FastifyReply) {
    try {
      const count = await notificationService.getUnreadCount(request.user!.userId);
      return reply.send({ unread: count });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async markAsRead(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const success = await notificationService.markAsRead(request.user!.userId, request.params.id);
      if (!success) return reply.status(404).send({ error: 'Notification not found or already read' });
      return reply.send({ message: 'Marked as read' });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async markAllAsRead(request: FastifyRequest, reply: FastifyReply) {
    try {
      const count = await notificationService.markAllAsRead(request.user!.userId);
      return reply.send({ message: `Marked ${count} notifications as read` });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
};
