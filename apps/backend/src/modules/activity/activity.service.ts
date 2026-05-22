import { prisma } from '../../db/prisma';

export interface CreateActivityPayload {
  workspaceId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
}

export const activityService = {
  /**
   * Logs an activity. Returns a promise but is designed to be called in a "fire-and-forget" non-blocking manner.
   * Future: This is where we'll hook into Socket.io for real-time feed broadcasts.
   */
  async createActivity(payload: CreateActivityPayload) {
    try {
      const activity = await prisma.activity.create({
        data: {
          workspaceId: payload.workspaceId,
          userId: payload.userId,
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId,
          metadata: payload.metadata || {},
        }
      });
      
      // TODO: Broadcast via Socket.IO -> io.to(workspaceId).emit('new_activity', activity);
      
      return activity;
    } catch (error) {
      // Catch silently to avoid crashing the main application flow
      console.error('[Activity Logging Failed]', error);
    }
  },

  async getActivities(workspaceId: string, filters: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const where: any = { workspaceId };

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const skip = (filters.page - 1) * filters.limit;

    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: filters.limit,
        include: {
          user: { select: { id: true, email: true, avatar: true } }
        }
      }),
      prisma.activity.count({ where })
    ]);

    return {
      data: activities,
      meta: {
        total: totalCount,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(totalCount / filters.limit)
      }
    };
  }
};
