import { query, transaction } from '../../db/client';
import { CreateProjectInput, UpdateProjectInput } from './project.schema';
import { Role } from '../../middleware/rbac.middleware';

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
    const project = await transaction(async (client) => {
      const projectResult = await client.query(
        `INSERT INTO projects (name, description, workspace_id, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, description, workspace_id, created_by, created_at, updated_at`,
        [data.name, data.description ?? null, data.workspaceId, userId]
      );
      const created = projectResult.rows[0];

      // Auto-assign creator as Project Admin
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, 'admin')`,
        [created.id, userId]
      );

      return created;
    });

    return mapProject(project);
  }

  async getProjects(workspaceId: string, userId?: string, userRole?: Role) {
    let result;
    if (userRole === Role.OWNER || userRole === Role.ADMIN || !userId) {
      result = await query(
        `SELECT p.*,
                u.email AS creator_email,
                u.name AS creator_name,
                COUNT(DISTINCT t.id)::int AS task_count,
                COUNT(DISTINCT s.id)::int AS snippet_count
         FROM projects p
         LEFT JOIN users u ON u.id = p.created_by
         LEFT JOIN tasks t ON t.project_id = p.id
         LEFT JOIN snippets s ON s.project_id = p.id
         WHERE p.workspace_id = $1
         GROUP BY p.id, u.email, u.name
         ORDER BY p.created_at DESC`,
        [workspaceId]
      );
    } else {
      result = await query(
        `SELECT p.*,
                u.email AS creator_email,
                u.name AS creator_name,
                COUNT(DISTINCT t.id)::int AS task_count,
                COUNT(DISTINCT s.id)::int AS snippet_count
         FROM projects p
         JOIN project_members pm ON pm.project_id = p.id
         LEFT JOIN users u ON u.id = p.created_by
         LEFT JOIN tasks t ON t.project_id = p.id
         LEFT JOIN snippets s ON s.project_id = p.id
         WHERE p.workspace_id = $1 AND pm.user_id = $2
         GROUP BY p.id, u.email, u.name
         ORDER BY p.created_at DESC`,
        [workspaceId, userId]
      );
    }
    return result.rows.map(mapProject);
  }

  async getProjectById(projectId: string) {
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

  async updateProject(projectId: string, data: UpdateProjectInput) {
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

  async deleteProject(projectId: string) {
    const result = await query('DELETE FROM projects WHERE id = $1', [projectId]);
    if (!result.rowCount) {
      throw new Error('Project not found');
    }
  }

  async listProjectMembers(projectId: string) {
    const result = await query(
      `SELECT pm.id, pm.project_id, pm.user_id, pm.role, u.name, u.email, u.avatar_url
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [projectId]
    );
    return result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      role: row.role.toUpperCase(),
      user: {
        id: row.user_id,
        name: row.name,
        email: row.email,
        avatar: row.avatar_url
      }
    }));
  }

  async assignProjectMember(projectId: string, userId: string, role: string) {
    const projRes = await query<{ workspace_id: string }>('SELECT workspace_id FROM projects WHERE id = $1', [projectId]);
    if (!projRes.rows[0]) {
      throw new Error('Project not found');
    }
    const workspaceId = projRes.rows[0].workspace_id;

    const wsMemberRes = await query(
      'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );
    if (!wsMemberRes.rowCount) {
      throw new Error('User is not a member of the workspace');
    }

    const result = await query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) 
       DO UPDATE SET role = EXCLUDED.role
       RETURNING id, project_id, user_id, role`,
      [projectId, userId, role.toLowerCase()]
    );
    return result.rows[0];
  }

  async removeProjectMember(projectId: string, userId: string) {
    const result = await query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
    if (!result.rowCount) {
      throw new Error('Member not found in project');
    }
    return { success: true };
  }
}

