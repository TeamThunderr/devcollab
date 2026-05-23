import { query } from '../../db/client';

function mapFile(file: any) {
  return {
    id: file.id,
    projectId: file.project_id,
    parentId: null,
    name: file.name,
    path: file.path,
    type: 'file',
    content: file.content,
    language: file.language,
    taskId: file.linked_task_id,
    createdBy: file.created_by,
    createdAt: file.created_at?.toISOString?.() ?? file.created_at,
    updatedAt: file.updated_at?.toISOString?.() ?? file.updated_at,
  };
}

export class EditorService {
  async getFileTree(projectId: string) {
    const result = await query(
      `SELECT id, project_id, name, path, language, content, linked_task_id, created_by, created_at, updated_at
       FROM code_files
       WHERE project_id = $1
       ORDER BY path ASC`,
      [projectId]
    );
    return result.rows.map(mapFile);
  }

  async getFile(projectId: string, fileId: string) {
    const result = await query(
      `SELECT id, project_id, name, path, language, content, linked_task_id, created_by, created_at, updated_at
       FROM code_files
       WHERE id = $1 AND project_id = $2`,
      [fileId, projectId]
    );
    return result.rows[0] ? mapFile(result.rows[0]) : null;
  }

  async createFile(data: { projectId: string; name: string; type?: string; parentId?: string; content?: string; language?: string; createdBy: string; taskId?: string; path?: string }) {
    const filePath = data.path || data.name;
    const result = await query(
      `INSERT INTO code_files (project_id, name, path, language, content, linked_task_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, project_id, name, path, language, content, linked_task_id, created_by, created_at, updated_at`,
      [
        data.projectId,
        data.name,
        filePath,
        data.language || 'plaintext',
        data.content || '',
        data.taskId || null,
        data.createdBy,
      ]
    );
    return mapFile(result.rows[0]);
  }

  async updateFile(projectId: string, fileId: string, data: { name?: string; content?: string; language?: string; taskId?: string | null }) {
    const result = await query(
      `UPDATE code_files
       SET name = COALESCE($3, name),
           content = COALESCE($4, content),
           language = COALESCE($5, language),
           linked_task_id = CASE WHEN $6::boolean THEN $7 ELSE linked_task_id END,
           updated_at = NOW()
       WHERE id = $1 AND project_id = $2
       RETURNING id, project_id, name, path, language, content, linked_task_id, created_by, created_at, updated_at`,
      [
        fileId,
        projectId,
        data.name ?? null,
        data.content ?? null,
        data.language ?? null,
        data.taskId !== undefined,
        data.taskId ?? null,
      ]
    );
    return result.rows[0] ? mapFile(result.rows[0]) : null;
  }

  async deleteFile(projectId: string, fileId: string) {
    const result = await query(
      `DELETE FROM code_files
       WHERE id = $1 AND project_id = $2
       RETURNING id`,
      [fileId, projectId]
    );
    return result.rows[0] ?? null;
  }
}
