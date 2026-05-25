import { query } from '../../db/client';
import { CreateSnippetInput, UpdateSnippetInput } from './snippet.schema';
import { requireProjectAccess } from '../../middleware/projectAccess';

function mapSnippet(snippet: any) {
  return {
    id: snippet.id,
    title: snippet.title,
    language: snippet.language,
    code: snippet.code,
    description: snippet.description ?? undefined,
    tags: snippet.tags || [],
    projectId: snippet.project_id,
    createdAt: snippet.created_at?.toISOString?.() ?? snippet.created_at,
    updatedAt: snippet.updated_at?.toISOString?.() ?? snippet.updated_at,
    createdBy: snippet.created_by ? {
      id: snippet.created_by,
      email: snippet.creator_email,
      name: snippet.creator_name,
    } : undefined,
  };
}

export class SnippetService {
  async createSnippet(data: CreateSnippetInput, userId: string) {
    await requireProjectAccess(userId, data.projectId);
    const result = await query(
      `INSERT INTO snippets (title, language, code, description, tags, project_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, language, code, description, tags, project_id, created_by, created_at, updated_at`,
      [data.title, data.language, data.code, data.description ?? null, data.tags || [], data.projectId, userId]
    );
    return mapSnippet(result.rows[0]);
  }

  async getSnippetsByProject(projectId: string, userId: string) {
    await requireProjectAccess(userId, projectId);
    const result = await query(
      `SELECT s.*, u.email AS creator_email, u.name AS creator_name
       FROM snippets s
       JOIN users u ON u.id = s.created_by
       WHERE s.project_id = $1
       ORDER BY s.created_at DESC`,
      [projectId]
    );
    return result.rows.map(mapSnippet);
  }

  async getSnippetById(snippetId: string, userId: string) {
    const result = await query(
      `SELECT s.*, u.email AS creator_email, u.name AS creator_name
       FROM snippets s
       JOIN users u ON u.id = s.created_by
       WHERE s.id = $1`,
      [snippetId]
    );
    const snippet = result.rows[0];
    if (!snippet) return null;
    
    await requireProjectAccess(userId, snippet.project_id);
    return mapSnippet(snippet);
  }

  async updateSnippet(snippetId: string, data: UpdateSnippetInput, userId: string) {
    const check = await query('SELECT project_id FROM snippets WHERE id = $1', [snippetId]);
    if (check.rowCount === 0) throw new Error('Snippet not found');
    await requireProjectAccess(userId, check.rows[0].project_id);

    const result = await query(
      `UPDATE snippets
       SET title = COALESCE($2, title),
           language = COALESCE($3, language),
           code = COALESCE($4, code),
           description = COALESCE($5, description),
           tags = COALESCE($6, tags),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, language, code, description, tags, project_id, created_by, created_at, updated_at`,
      [snippetId, data.title ?? null, data.language ?? null, data.code ?? null, data.description ?? null, data.tags ?? null]
    );
    if (!result.rows[0]) {
      throw new Error('Snippet not found');
    }
    return mapSnippet(result.rows[0]);
  }

  async deleteSnippet(snippetId: string, userId: string) {
    const check = await query('SELECT project_id FROM snippets WHERE id = $1', [snippetId]);
    if (check.rowCount === 0) throw new Error('Snippet not found');
    await requireProjectAccess(userId, check.rows[0].project_id);

    const result = await query('DELETE FROM snippets WHERE id = $1', [snippetId]);
    if (!result.rowCount) {
      throw new Error('Snippet not found');
    }
  }

  async searchSnippets(projectId: string, search: string, userId: string) {
    await requireProjectAccess(userId, projectId);
    const normalizedQuery = search.trim();
    const result = await query(
      `SELECT s.*, u.email AS creator_email, u.name AS creator_name
       FROM snippets s
       JOIN users u ON u.id = s.created_by
       WHERE s.project_id = $1
         AND (s.title ILIKE $2 OR $3 = ANY(s.tags))
       ORDER BY s.created_at DESC`,
      [projectId, `%${normalizedQuery}%`, normalizedQuery]
    );
    return result.rows.map(mapSnippet);
  }
}
