import { query } from '../../db/client';
import { CreateProjectInput, UpdateProjectInput } from './project.schema';

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

  async getProjects(workspaceId: string) {
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
       WHERE p.workspace_id = $1
       GROUP BY p.id, u.email, u.name
       ORDER BY p.created_at DESC`,
      [workspaceId]
    );
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
}
