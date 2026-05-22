import { prisma } from '../../db/prisma';

export interface CreateNotificationPayload {
  userId: string;
  type: string;
  message: string;
  metadata?: any;
}

export const notificationService = {
  /**
   * Logs a notification asynchronously.
   * Includes the centralized placeholder for Socket.IO push events.
   */
  async createNotification(payload: CreateNotificationPayload) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          message: payload.message,
          metadata: payload.metadata || {},
        }
      });
      
      // TODO: Centralized emitNotification placeholder
      // io.to(`user_${payload.userId}`).emit('new_notification', notification);

      return notification;
    } catch (error) {
      console.error('[Notification Logging Failed]', error);
    }
  },

  async getNotifications(userId: string, filters: { page: number; limit: number; isRead?: string; type?: string }) {
    const where: any = { userId };

    if (filters.isRead === 'true') {
      where.readAt = { not: null };
    } else if (filters.isRead === 'false') {
      where.readAt = null;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    const skip = (filters.page - 1) * filters.limit;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, readAt: null } })
    ]);

    return {
      notifications,
      meta: {
        total: totalCount,
        unread: unreadCount,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(totalCount / filters.limit)
      }
    };
  },

  async markAsRead(userId: string, notificationId: string) {
    // Only update if it belongs to the user and is currently unread
    const updated = await prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() }
    });
    return updated.count > 0;
  },

  async markAllAsRead(userId: string) {
    const updated = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() }
    });
    return updated.count;
  },

  async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: { userId, readAt: null }
    });
  }
};
