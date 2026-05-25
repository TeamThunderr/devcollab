import { query } from '../../db/client';

export interface CreateNotificationPayload {
  userId: string;
  type: string;
  message: string;
  metadata?: any;
}

const allowedTypes = new Set(['mention', 'assignment', 'task_moved', 'comment']);

function normalizeType(type: string): string {
  const normalized = type.toLowerCase();
  return allowedTypes.has(normalized) ? normalized : 'mention';
}

function mapNotification(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    message: row.title,
    body: row.body,
    metadata: row.metadata ?? {},
    readAt: row.read_at?.toISOString?.() ?? row.read_at,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

export const notificationService = {
  async createNotification(payload: CreateNotificationPayload) {
    try {
      const result = await query(
        `INSERT INTO notifications (user_id, type, title, body)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, type, title, body, read_at, created_at`,
        [payload.userId, normalizeType(payload.type), payload.message, JSON.stringify(payload.metadata ?? {})]
      );
      return mapNotification(result.rows[0]);
    } catch (error) {
      console.error('[Notification Logging Failed]', error);
      return undefined;
    }
  },

  async getNotifications(userId: string, filters: { page: number; limit: number; isRead?: string; type?: string }) {
    const where: string[] = ['user_id = $1'];
    const params: any[] = [userId];

    where.push(`(
      related_task_id IS NULL OR 
      related_task_id IN (
        SELECT t.id 
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $1
        LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
        WHERE wm.role IN ('owner', 'admin') OR pm.id IS NOT NULL
      )
    )`);

    if (filters.isRead === 'true') {
      where.push('read_at IS NOT NULL');
    } else if (filters.isRead === 'false') {
      where.push('read_at IS NULL');
    }

    if (filters.type) {
      params.push(normalizeType(filters.type));
      where.push(`type = $${params.length}`);
    }

    const skip = (filters.page - 1) * filters.limit;
    const whereSql = where.join(' AND ');

    const [notifications, totalCount, unreadCount] = await Promise.all([
      query(
        `SELECT id, user_id, type, title, body, read_at, created_at
         FROM notifications
         WHERE ${whereSql}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, filters.limit, skip]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM notifications
         WHERE ${whereSql}`,
        params
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM notifications
         WHERE user_id = $1 AND read_at IS NULL`,
        [userId]
      ),
    ]);

    const total = Number(totalCount.rows[0]?.count ?? 0);
    return {
      notifications: notifications.rows.map(mapNotification),
      meta: {
        total,
        unread: Number(unreadCount.rows[0]?.count ?? 0),
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },

  async markAsRead(userId: string, notificationId: string) {
    const result = await query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL
       RETURNING id`,
      [notificationId, userId]
    );
    return Boolean(result.rowCount);
  },

  async markAllAsRead(userId: string) {
    const result = await query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );
    return result.rowCount ?? 0;
  },

  async getUnreadCount(userId: string) {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM notifications
       WHERE user_id = $1 AND read_at IS NULL`,
      [userId]
    );
    return Number(result.rows[0]?.count ?? 0);
  },
};
