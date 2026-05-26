import { query } from '../db/client';
import { AppError } from '../utils/errors';

export async function requireProjectAccess(userId: string, projectId: string): Promise<void> {
  // Find project's workspace and the user's role in that workspace, as well as project visibility
  const workspaceCheck = await query<{
    workspace_id: string;
    role: string;
    visibility: string;
  }>(
    `SELECT p.workspace_id, wm.role, p.visibility
     FROM projects p
     LEFT JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
     WHERE p.id = $1`,
    [projectId, userId]
  );

  const result = workspaceCheck.rows[0];
  if (!result) {
    throw new AppError(404, 'Project not found');
  }
  if (!result.role) {
    throw new AppError(403, 'Forbidden: You are not a member of this workspace');
  }

  const workspaceRole = result.role; // 'owner', 'admin', 'member', 'viewer'
  const visibility = result.visibility || 'public';

  // 1. VIEWER role: Can ONLY access public projects
  if (workspaceRole === 'viewer') {
    if (visibility !== 'public') {
      throw new AppError(403, 'Forbidden: Private projects are not accessible to viewers');
    }
    return;
  }

  // 2. OWNER, ADMIN, MEMBER roles: Strictly require explicit membership in project_members
  const memberCheck = await query(
    `SELECT 1 FROM project_members
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );

  if (memberCheck.rowCount === 0) {
    throw new AppError(403, 'Forbidden: You are not assigned to this project');
  }
  return;
}
