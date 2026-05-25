import { query } from '../../db/client';
import { requireProjectAccess } from '../../middleware/projectAccess';

function slugify(title: string, id: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${slug || 'page'}-${id.slice(0, 8)}`;
}

function mapPage(page: any) {
  return {
    id: page.id,
    workspaceId: page.workspace_id,
    projectId: page.project_id,
    title: page.title,
    slug: slugify(page.title, page.id),
    content: page.content ?? '',
    linkedTaskId: null,
    linkedFileId: null,
    createdBy: page.created_by,
    updatedBy: page.updated_by,
    createdAt: page.created_at?.toISOString?.() ?? page.created_at,
    updatedAt: page.updated_at?.toISOString?.() ?? page.updated_at,
  };
}

function mapVersion(version: any) {
  return {
    id: version.id,
    pageId: version.page_id,
    contentSnapshot: version.content,
    versionNumber: Number(version.version_number ?? 1),
    createdBy: version.updated_by,
    createdAt: version.created_at?.toISOString?.() ?? version.created_at,
  };
}

export class WikiService {
  async getPages(projectId: string, userId: string) {
    await requireProjectAccess(userId, projectId);
    const result = await query(
      `SELECT wp.*, p.workspace_id
       FROM wiki_pages wp
       JOIN projects p ON p.id = wp.project_id
       WHERE wp.project_id = $1
       ORDER BY wp.updated_at DESC`,
      [projectId]
    );
    return result.rows.map(mapPage);
  }

  async getPage(id: string, userId: string) {
    const result = await query(
      `SELECT wp.*, p.workspace_id
       FROM wiki_pages wp
       JOIN projects p ON p.id = wp.project_id
       WHERE wp.id = $1`,
      [id]
    );
    const page = result.rows[0];
    if (!page) return null;
    
    await requireProjectAccess(userId, page.project_id);
    return mapPage(page);
  }

  async createPage(data: { workspaceId: string; projectId: string; title: string; content?: string; createdBy: string }, userId: string) {
    await requireProjectAccess(userId, data.projectId);
    const result = await query(
      `INSERT INTO wiki_pages (project_id, title, content, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $4)
       RETURNING id, project_id, title, content, parent_page_id, created_by, updated_by, created_at, updated_at`,
      [data.projectId, data.title, data.content || '', data.createdBy]
    );
    return mapPage({ ...result.rows[0], workspace_id: data.workspaceId });
  }

  async updatePage(id: string, data: { title?: string; content?: string; updatedBy: string }, userId: string) {
    const check = await query('SELECT project_id FROM wiki_pages WHERE id = $1', [id]);
    if (check.rowCount === 0) throw new Error('Page not found');
    await requireProjectAccess(userId, check.rows[0].project_id);

    const result = await query(
      `UPDATE wiki_pages
       SET title = COALESCE($2, title),
           content = COALESCE($3, content),
           updated_by = $4,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, project_id, title, content, parent_page_id, created_by, updated_by, created_at, updated_at`,
      [id, data.title ?? null, data.content ?? null, data.updatedBy]
    );
    if (!result.rows[0]) {
      throw new Error('Page not found');
    }

    const workspace = await query<{ workspace_id: string }>('SELECT workspace_id FROM projects WHERE id = $1', [result.rows[0].project_id]);
    return mapPage({ ...result.rows[0], workspace_id: workspace.rows[0]?.workspace_id });
  }

  async deletePage(id: string, userId: string) {
    const check = await query('SELECT project_id FROM wiki_pages WHERE id = $1', [id]);
    if (check.rowCount === 0) throw new Error('Page not found');
    await requireProjectAccess(userId, check.rows[0].project_id);

    const result = await query('DELETE FROM wiki_pages WHERE id = $1 RETURNING id', [id]);
    if (!result.rows[0]) {
      throw new Error('Page not found');
    }
    return result.rows[0];
  }

  async getVersions(pageId: string, userId: string) {
    const check = await query('SELECT project_id FROM wiki_pages WHERE id = $1', [pageId]);
    if (check.rowCount === 0) throw new Error('Page not found');
    await requireProjectAccess(userId, check.rows[0].project_id);

    const result = await query(
      `SELECT id, page_id, content, updated_by, created_at,
              ROW_NUMBER() OVER (ORDER BY created_at ASC) AS version_number
       FROM wiki_page_versions
       WHERE page_id = $1
       ORDER BY created_at DESC`,
      [pageId]
    );
    return result.rows.map(mapVersion);
  }

  async createVersion(pageId: string, createdBy: string, userId: string) {
    const page = await this.getPage(pageId, userId);
    if (!page) {
      throw new Error('Page not found');
    }

    const result = await query(
      `INSERT INTO wiki_page_versions (page_id, content, updated_by)
       VALUES ($1, $2, $3)
       RETURNING id, page_id, content, updated_by, created_at`,
      [pageId, page.content, createdBy]
    );
    const count = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM wiki_page_versions
       WHERE page_id = $1`,
      [pageId]
    );
    return mapVersion({ ...result.rows[0], version_number: Number(count.rows[0]?.count ?? 1) });
  }

  async restoreVersion(pageId: string, versionId: string, updatedBy: string, userId: string) {
    const check = await query('SELECT project_id FROM wiki_pages WHERE id = $1', [pageId]);
    if (check.rowCount === 0) throw new Error('Page not found');
    await requireProjectAccess(userId, check.rows[0].project_id);

    const versionResult = await query(
      `SELECT id, page_id, content
       FROM wiki_page_versions
       WHERE id = $1 AND page_id = $2`,
      [versionId, pageId]
    );
    const version = versionResult.rows[0];
    if (!version) {
      throw new Error('Version not found');
    }

    return this.updatePage(pageId, {
      content: version.content,
      updatedBy,
    }, userId);
  }
}
