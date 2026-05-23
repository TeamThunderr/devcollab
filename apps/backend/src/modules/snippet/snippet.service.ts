import { query } from '../../db/client';
import { CreateSnippetInput, UpdateSnippetInput } from './snippet.schema';

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
    const result = await query(
      `INSERT INTO snippets (title, language, code, description, tags, project_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, language, code, description, tags, project_id, created_by, created_at, updated_at`,
      [data.title, data.language, data.code, data.description ?? null, data.tags || [], data.projectId, userId]
    );
    return mapSnippet(result.rows[0]);
  }

  async getSnippetsByProject(projectId: string) {
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

  async getSnippetById(snippetId: string) {
    const result = await query(
      `SELECT s.*, u.email AS creator_email, u.name AS creator_name
       FROM snippets s
       JOIN users u ON u.id = s.created_by
       WHERE s.id = $1`,
      [snippetId]
    );
    return result.rows[0] ? mapSnippet(result.rows[0]) : null;
  }

  async updateSnippet(snippetId: string, data: UpdateSnippetInput) {
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

  async deleteSnippet(snippetId: string) {
    const result = await query('DELETE FROM snippets WHERE id = $1', [snippetId]);
    if (!result.rowCount) {
      throw new Error('Snippet not found');
    }
  }

  async searchSnippets(projectId: string, search: string) {
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
