import { query } from '../../db/client';

export interface CreateActivityPayload {
  workspaceId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  projectId?: string | null;
  metadata?: any;
}

function mapActivity(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    userId: row.user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    user: row.email ? {
      id: row.user_id,
      email: row.email,
      name: row.name,
      avatar: row.avatar_url,
    } : undefined,
  };
}

export const activityService = {
  async createActivity(payload: CreateActivityPayload) {
    try {
      const result = await query(
        `INSERT INTO activity_feed (workspace_id, project_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, workspace_id, project_id, user_id, action, entity_type, entity_id, metadata, created_at`,
        [
          payload.workspaceId,
          payload.projectId ?? null,
          payload.userId,
          payload.action,
          payload.entityType,
          payload.entityId,
          payload.metadata ?? {},
        ]
      );
      return mapActivity(result.rows[0]);
    } catch (error) {
      console.error('[Activity Logging Failed]', error);
      return undefined;
    }
  },

  async getActivities(workspaceId: string, userId: string, filters: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }, requestingUserId?: string, requestingUserRole?: string) {
    // Check if the user is OWNER/ADMIN in this workspace
    const roleCheck = await query<{ role: string }>(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );
    const role = roleCheck.rows[0]?.role;
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';

    const where: string[] = ['a.workspace_id = $1'];
    const params: any[] = [workspaceId];

    if (!isOwnerOrAdmin) {
      // For MEMBER/VIEWER, filter out activities belonging to projects they aren't part of
      params.push(userId);
      where.push(`(a.project_id IS NULL OR a.project_id IN (SELECT project_id FROM project_members WHERE user_id = $${params.length}))`);
    }

    if (filters.userId) {
      params.push(filters.userId);
      where.push(`a.user_id = $${params.length}`);
    }
    if (filters.action) {
      params.push(filters.action);
      where.push(`a.action = $${params.length}`);
    }
    if (filters.startDate) {
      params.push(filters.startDate);
      where.push(`a.created_at >= $${params.length}`);
    }
    if (filters.endDate) {
      params.push(filters.endDate);
      where.push(`a.created_at <= $${params.length}`);
    }

    if (requestingUserRole !== 'OWNER' && requestingUserRole !== 'ADMIN' && requestingUserId) {
      params.push(requestingUserId);
      where.push(`(a.project_id IS NULL OR a.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = $${params.length}
      ))`);
    }

    const skip = (filters.page - 1) * filters.limit;
    const whereSql = where.join(' AND ');

    const dataParams = [...params, filters.limit, skip];
    const [activities, totalCount] = await Promise.all([
      query(
        `SELECT a.*, u.email, u.name, u.avatar_url
         FROM activity_feed a
         JOIN users u ON u.id = a.user_id
         WHERE ${whereSql}
         ORDER BY a.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        dataParams
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM activity_feed a
         WHERE ${whereSql}`,
        params
      ),
    ]);

    const total = Number(totalCount.rows[0]?.count ?? 0);
    return {
      data: activities.rows.map(mapActivity),
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },
};
