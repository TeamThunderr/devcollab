import { query } from '../../db/client';
import { CreateProjectInput, UpdateProjectInput, AssignMemberInput } from './project.schema';
import { requireProjectAccess } from '../../middleware/projectAccess';
import { AppError } from '../../utils/errors';

function mapProject(project: any) {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? undefined,
    workspaceId: project.workspace_id,
    createdAt: project.created_at?.toISOString?.() ?? project.created_at,
    updatedAt: project.updated_at?.toISOString?.() ?? project.updated_at,
    createdBy: project.created_by ? {
      id: project.created_by,
      email: project.creator_email,
      name: project.creator_name,
    } : undefined,
    _count: {
      tasks: Number(project.task_count ?? 0),
      snippets: Number(project.snippet_count ?? 0),
    },
  };
}

export class ProjectService {
  async createProject(data: CreateProjectInput, userId: string) {
    const result = await query(
      `INSERT INTO projects (name, description, workspace_id, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, workspace_id, created_by, created_at, updated_at`,
      [data.name, data.description ?? null, data.workspaceId, userId]
    );
    return mapProject(result.rows[0]);
  }

  async getProjects(workspaceId: string, userId: string) {
    const workspaceRoleCheck = await query<{ role: string }>(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );

    const role = workspaceRoleCheck.rows[0]?.role;
    if (!role) {
      throw new AppError(403, 'Forbidden: You are not a member of this workspace');
    }

    const isOwnerOrAdmin = role === 'owner' || role === 'admin';

    const result = await query(
      `SELECT p.*,
              u.email AS creator_email,
              u.name AS creator_name,
              COUNT(DISTINCT t.id)::int AS task_count,
              COUNT(DISTINCT s.id)::int AS snippet_count
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN tasks t ON t.project_id = p.id
       LEFT JOIN snippets s ON s.project_id = p.id
       ${isOwnerOrAdmin ? '' : 'INNER JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2'}
       WHERE p.workspace_id = $1
       GROUP BY p.id, u.email, u.name
       ORDER BY p.created_at DESC`,
      isOwnerOrAdmin ? [workspaceId] : [workspaceId, userId]
    );
    return result.rows.map(mapProject);
  }

  async getProjectById(projectId: string, userId: string) {
    await requireProjectAccess(userId, projectId);
    
    const result = await query(
      `SELECT p.*,
              u.email AS creator_email,
              u.name AS creator_name,
              COUNT(DISTINCT t.id)::int AS task_count,
              COUNT(DISTINCT s.id)::int AS snippet_count
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN tasks t ON t.project_id = p.id
       LEFT JOIN snippets s ON s.project_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, u.email, u.name`,
      [projectId]
    );
    return result.rows[0] ? mapProject(result.rows[0]) : null;
  }

  async updateProject(projectId: string, data: UpdateProjectInput, userId: string) {
    await requireProjectAccess(userId, projectId);
    
    const result = await query(
      `UPDATE projects
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, description, workspace_id, created_by, created_at, updated_at`,
      [projectId, data.name ?? null, data.description ?? null]
    );
    if (!result.rows[0]) {
      throw new Error('Project not found');
    }
    return mapProject(result.rows[0]);
  }

  async deleteProject(projectId: string, userId: string) {
    await requireProjectAccess(userId, projectId);
    
    const result = await query('DELETE FROM projects WHERE id = $1', [projectId]);
    if (!result.rowCount) {
      throw new Error('Project not found');
    }
  }

  async getProjectMembers(projectId: string, userId: string) {
    await requireProjectAccess(userId, projectId);

    const result = await query(
      `SELECT pm.id, pm.project_id, pm.user_id, pm.role,
              u.email, u.name, u.avatar_url, u.bio
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [projectId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      role: row.role?.toUpperCase() || 'MEMBER',
      user: {
        id: row.user_id,
        email: row.email,
        name: row.name,
        avatar: row.avatar_url,
        bio: row.bio,
      },
    }));
  }

  async assignMember(projectId: string, data: AssignMemberInput, assignerId: string) {
    // Only owners/admins should be able to assign members.
    // We check the workspace role of the assigner.
    const workspaceCheck = await query<{ role: string }>(
      `SELECT wm.role
       FROM projects p
       JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
       WHERE p.id = $1`,
      [projectId, assignerId]
    );

    const role = workspaceCheck.rows[0]?.role;
    if (role !== 'owner' && role !== 'admin') {
      throw new AppError(403, 'Forbidden: Only workspace admins can manage project members');
    }

    const checkExisting = await query(
      `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, data.userId]
    );

    if (checkExisting.rowCount && checkExisting.rowCount > 0) {
      throw new AppError(400, 'User is already a member of this project');
    }

    const result = await query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'member')
       RETURNING id, project_id, user_id, role`,
      [projectId, data.userId]
    );

    const userResult = await query(
      `SELECT email, name, avatar_url, bio FROM users WHERE id = $1`,
      [data.userId]
    );

    const userRow = userResult.rows[0];

    return {
      id: result.rows[0].id,
      projectId: result.rows[0].project_id,
      userId: result.rows[0].user_id,
      role: result.rows[0].role?.toUpperCase() || 'MEMBER',
      user: {
        id: result.rows[0].user_id,
        email: userRow.email,
        name: userRow.name,
        avatar: userRow.avatar_url,
        bio: userRow.bio,
      },
    };
  }

  async removeMember(projectId: string, targetUserId: string, removerId: string) {
    const workspaceCheck = await query<{ role: string }>(
      `SELECT wm.role
       FROM projects p
       JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
       WHERE p.id = $1`,
      [projectId, removerId]
    );

    const role = workspaceCheck.rows[0]?.role;
    if (role !== 'owner' && role !== 'admin' && removerId !== targetUserId) {
      throw new AppError(403, 'Forbidden: Only workspace admins can remove project members');
    }

    const result = await query(
      `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, targetUserId]
    );

    if (!result.rowCount) {
      throw new AppError(404, 'Project member not found');
    }
  }
}
