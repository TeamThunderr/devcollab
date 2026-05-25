import { query } from '../db/client';
import { AppError } from '../utils/errors';

export async function requireProjectAccess(userId: string, projectId: string): Promise<void> {
  // Find project's workspace and the user's role in that workspace
  const workspaceCheck = await query<{
    workspace_id: string;
    role: string;
  }>(
    `SELECT p.workspace_id, wm.role
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

  // OWNER and ADMIN have bypass
  if (result.role === 'owner' || result.role === 'admin') {
    return;
  }

  // Check project membership for MEMBER and VIEWER
  const memberCheck = await query(
    `SELECT 1 FROM project_members
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );

  if (memberCheck.rowCount === 0) {
    throw new AppError(403, 'Forbidden: You are not assigned to this project');
  }
}
