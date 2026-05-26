import { query } from '../../db/client';
import { CreateSnippetInput, UpdateSnippetInput } from './snippet.schema';
import { requireProjectAccess } from '../../middleware/projectAccess';
import { activityService } from '../activity/activity.service';

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

    // Enforce VIEWER restrictions
    const wsMemberRes = await query<{ role: string }>(
      `SELECT role FROM workspace_members wm
       JOIN projects p ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND wm.user_id = $2`,
      [data.projectId, userId]
    );
    const wsRole = wsMemberRes.rows[0]?.role?.toUpperCase();

    const projMemberRes = await query<{ role: string }>(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [data.projectId, userId]
    );
    const projRole = projMemberRes.rows[0]?.role?.toUpperCase();

    const isViewer = (wsRole === 'VIEWER' || projRole === 'VIEWER') && wsRole !== 'OWNER' && wsRole !== 'ADMIN';
    if (isViewer) {
      throw new Error('Unauthorized: Viewers have read-only access and cannot create snippets');
    }

    const result = await query(
      `INSERT INTO snippets (title, language, code, description, tags, project_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, language, code, description, tags, project_id, created_by, created_at, updated_at`,
      [data.title, data.language, data.code, data.description ?? null, data.tags || [], data.projectId, userId]
    );
    const snippet = mapSnippet(result.rows[0]);

    // Log Activity
    const workspaceRes = await query<{ workspace_id: string }>(
      'SELECT workspace_id FROM projects WHERE id = $1',
      [data.projectId]
    );
    const workspaceId = workspaceRes.rows[0]?.workspace_id;
    if (workspaceId) {
      await activityService.createActivity({
        workspaceId,
        projectId: data.projectId,
        userId,
        action: 'create',
        entityType: 'snippet',
        entityId: snippet.id,
        metadata: { title: snippet.title },
      });
    }

    return snippet;
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

  async updateSnippet(snippetId: string, userId: string, data: UpdateSnippetInput) {
    const check = await query('SELECT project_id, title FROM snippets WHERE id = $1', [snippetId]);
    if (check.rowCount === 0) throw new Error('Snippet not found');
    const projectId = check.rows[0].project_id;
    const oldTitle = check.rows[0].title;
    await requireProjectAccess(userId, projectId);

    const snipRes = await query<{ created_by: string; project_id: string }>(
      'SELECT created_by, project_id FROM snippets WHERE id = $1',
      [snippetId]
    );
    const snip = snipRes.rows[0];
    if (!snip) {
      throw new Error('Snippet not found');
    }

    const isCreator = snip.created_by === userId;

    const wsMemberRes = await query<{ role: string }>(
      `SELECT role FROM workspace_members wm
       JOIN projects p ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND wm.user_id = $2`,
      [snip.project_id, userId]
    );
    const wsRole = wsMemberRes.rows[0]?.role?.toUpperCase();
    const isWorkspaceAdmin = wsRole === 'OWNER' || wsRole === 'ADMIN';

    const projMemberRes = await query<{ role: string }>(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [snip.project_id, userId]
    );
    const projRole = projMemberRes.rows[0]?.role?.toUpperCase();
    const isProjectAdmin = projRole === 'ADMIN';

    const isViewer = (wsRole === 'VIEWER' || projRole === 'VIEWER') && wsRole !== 'OWNER' && wsRole !== 'ADMIN';
    if (isViewer) {
      throw new Error('Unauthorized: Viewers have read-only access and cannot modify snippets');
    }

    if (!isCreator && !isWorkspaceAdmin && !isProjectAdmin) {
      throw new Error('Unauthorized snippet modification');
    }

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
    const snippet = mapSnippet(result.rows[0]);

    // Log Activity
    const workspaceRes = await query<{ workspace_id: string }>(
      'SELECT workspace_id FROM projects WHERE id = $1',
      [snip.project_id]
    );
    const workspaceId = workspaceRes.rows[0]?.workspace_id;
    if (workspaceId) {
      await activityService.createActivity({
        workspaceId,
        projectId: snip.project_id,
        userId,
        action: 'update',
        entityType: 'snippet',
        entityId: snippetId,
        metadata: { title: data.title || oldTitle },
      });
    }

    return snippet;
  }

  async deleteSnippet(snippetId: string, userId: string) {
    const snipRes = await query<{ created_by: string; project_id: string; title: string }>(
      'SELECT created_by, project_id, title FROM snippets WHERE id = $1',
      [snippetId]
    );
    const snip = snipRes.rows[0];
    if (!snip) {
      throw new Error('Snippet not found');
    }

    const isCreator = snip.created_by === userId;

    const wsMemberRes = await query<{ role: string }>(
      `SELECT role FROM workspace_members wm
       JOIN projects p ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND wm.user_id = $2`,
      [snip.project_id, userId]
    );
    const wsRole = wsMemberRes.rows[0]?.role?.toUpperCase();
    const isWorkspaceAdmin = wsRole === 'OWNER' || wsRole === 'ADMIN';

    const projMemberRes = await query<{ role: string }>(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [snip.project_id, userId]
    );
    const projRole = projMemberRes.rows[0]?.role?.toUpperCase();
    const isProjectAdmin = projRole === 'ADMIN';

    const isViewer = (wsRole === 'VIEWER' || projRole === 'VIEWER') && wsRole !== 'OWNER' && wsRole !== 'ADMIN';
    if (isViewer) {
      throw new Error('Unauthorized: Viewers have read-only access and cannot delete snippets');
    }

    if (!isCreator && !isWorkspaceAdmin && !isProjectAdmin) {
      throw new Error('Unauthorized snippet modification');
    }

    const result = await query('DELETE FROM snippets WHERE id = $1', [snippetId]);
    if (!result.rowCount) {
      throw new Error('Snippet not found');
    }

    // Log Activity
    const workspaceRes = await query<{ workspace_id: string }>(
      'SELECT workspace_id FROM projects WHERE id = $1',
      [snip.project_id]
    );
    const workspaceId = workspaceRes.rows[0]?.workspace_id;
    if (workspaceId) {
      await activityService.createActivity({
        workspaceId,
        projectId: snip.project_id,
        userId,
        action: 'delete',
        entityType: 'snippet',
        entityId: snippetId,
        metadata: { title: snip.title },
      });
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
