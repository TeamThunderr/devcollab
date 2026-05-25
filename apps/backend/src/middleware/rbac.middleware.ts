import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db/client';
import { AppError } from '../utils/errors';

export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  joinedAt: string;
}

export interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyRequest {
    membership?: WorkspaceMembership;
    projectMembership?: ProjectMembership;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: any): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function toApiRole(role: string): Role {
  return role.toUpperCase() as Role;
}

export const verifyWorkspaceAccess = (allowedRoles?: Role[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        throw new AppError(401, 'Unauthorized: Please authenticate first');
      }

      // 1. Resolve workspaceId from params, body, or query
      let workspaceId = (request.params as any)?.workspaceId ||
                        (request.body as any)?.workspaceId ||
                        (request.query as any)?.workspaceId;

      if (!workspaceId) {
        // Try to resolve from project ID if possible
        let projectId = (request.params as any)?.projectId ||
                          (request.body as any)?.projectId ||
                          (request.query as any)?.projectId;

        const id = (request.params as any)?.id;
        const routerPath = request.routeOptions?.url || '';
        if (!projectId && id && (routerPath.includes('/projects/:id') || routerPath.includes('/:projectId/messages') || routerPath.includes('/:projectId/unread') || routerPath.includes('/:projectId/seen') || routerPath.includes('/:projectId/members'))) {
          projectId = id;
        }

        if (projectId && isValidUuid(projectId)) {
          const projResult = await query<{ workspace_id: string }>(
            'SELECT workspace_id FROM projects WHERE id = $1',
            [projectId]
          );
          if (projResult.rows[0]) {
            workspaceId = projResult.rows[0].workspace_id;
          }
        }
      }

      if (!workspaceId) {
        // Check task, snippet, wiki if we have an :id param
        const id = (request.params as any)?.id;
        if (id && isValidUuid(id)) {
          // Check task
          const taskRes = await query<{ project_id: string }>('SELECT project_id FROM tasks WHERE id = $1', [id]);
          if (taskRes.rows[0]) {
            const projResult = await query<{ workspace_id: string }>('SELECT workspace_id FROM projects WHERE id = $1', [taskRes.rows[0].project_id]);
            if (projResult.rows[0]) {
              workspaceId = projResult.rows[0].workspace_id;
            }
          } else {
            // Check snippet
            const snippetRes = await query<{ project_id: string }>('SELECT project_id FROM snippets WHERE id = $1', [id]);
            if (snippetRes.rows[0]) {
              const projResult = await query<{ workspace_id: string }>('SELECT workspace_id FROM projects WHERE id = $1', [snippetRes.rows[0].project_id]);
              if (projResult.rows[0]) {
                workspaceId = projResult.rows[0].workspace_id;
              }
            } else {
              // Check wiki page
              const wikiRes = await query<{ project_id: string }>('SELECT project_id FROM wiki_pages WHERE id = $1', [id]);
              if (wikiRes.rows[0]) {
                const projResult = await query<{ workspace_id: string }>('SELECT workspace_id FROM projects WHERE id = $1', [wikiRes.rows[0].project_id]);
                if (projResult.rows[0]) {
                  workspaceId = projResult.rows[0].workspace_id;
                }
              }
            }
          }
        }
      }

      if (!workspaceId) {
        throw new AppError(400, 'Bad Request: workspaceId is required');
      }

      if (!isValidUuid(workspaceId)) {
        throw new AppError(400, 'Bad Request: workspaceId must be a valid UUID');
      }

      // Query workspace membership
      const result = await query<{
        id: string;
        workspace_id: string;
        user_id: string;
        role: string;
        joined_at: any;
      }>(
        `SELECT id, workspace_id, user_id, role, joined_at
         FROM workspace_members
         WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, request.user.userId]
      );
      const membership = result.rows[0];

      if (!membership) {
        throw new AppError(403, 'Forbidden: You are not a member of this workspace');
      }

      const apiRole = toApiRole(membership.role);
      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(apiRole)) {
        throw new AppError(403, `Forbidden: Requires one of workspace roles: ${allowedRoles.join(', ')}`);
      }

      // Enforce workspace-level write protections for VIEWER role
      const method = request.method;
      const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      if (isWrite && apiRole === Role.VIEWER) {
        throw new AppError(403, 'Forbidden: Workspace Viewers have read-only access and cannot modify resources');
      }

      let joinedAtStr = new Date().toISOString();
      if (membership.joined_at) {
        try {
          joinedAtStr = membership.joined_at instanceof Date 
            ? membership.joined_at.toISOString() 
            : new Date(membership.joined_at).toISOString();
        } catch {
          joinedAtStr = new Date().toISOString();
        }
      }

      request.membership = {
        id: membership.id,
        workspaceId: membership.workspace_id,
        userId: membership.user_id,
        role: apiRole,
        joinedAt: joinedAtStr,
      };
    } catch (error) {
      console.error('[verifyWorkspaceAccess Error]', error);
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  };
};

export const verifyProjectAccess = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user) {
      throw new AppError(401, 'Unauthorized: Please authenticate first');
    }

    // 1. Resolve projectId
    let projectId = (request.params as any)?.projectId ||
                    (request.body as any)?.projectId ||
                    (request.query as any)?.projectId;

    const id = (request.params as any)?.id;
    const routerPath = request.routeOptions?.url || '';
    if (!projectId && id && (routerPath.includes('/projects/:id') || routerPath.includes('/:projectId/messages') || routerPath.includes('/:projectId/unread') || routerPath.includes('/:projectId/seen') || routerPath.includes('/:projectId/members'))) {
      projectId = id;
    }

    if (!projectId && id && isValidUuid(id)) {
      // Resolve project_id from tasks/snippets/wiki_pages
      const taskRes = await query<{ project_id: string }>('SELECT project_id FROM tasks WHERE id = $1', [id]);
      if (taskRes.rows[0]) {
        projectId = taskRes.rows[0].project_id;
      } else {
        const snippetRes = await query<{ project_id: string }>('SELECT project_id FROM snippets WHERE id = $1', [id]);
        if (snippetRes.rows[0]) {
          projectId = snippetRes.rows[0].project_id;
        } else {
          const wikiRes = await query<{ project_id: string }>('SELECT project_id FROM wiki_pages WHERE id = $1', [id]);
          if (wikiRes.rows[0]) {
            projectId = wikiRes.rows[0].project_id;
          }
        }
      }
    }

    if (!projectId) {
      throw new AppError(400, 'Bad Request: projectId could not be resolved');
    }

    if (!isValidUuid(projectId)) {
      throw new AppError(400, 'Bad Request: projectId must be a valid UUID');
    }

    // 2. Ensure workspace access has run (defines request.membership)
    if (!request.membership) {
      // Resolve workspaceId for the project to execute verifyWorkspaceAccess
      const projResult = await query<{ workspace_id: string }>(
        'SELECT workspace_id FROM projects WHERE id = $1',
        [projectId]
      );
      if (!projResult.rows[0]) {
        throw new AppError(404, 'Project not found');
      }
      
      const workspaceId = projResult.rows[0].workspace_id;
      // We manually construct request params/body/query for verifyWorkspaceAccess
      if (!request.params) {
        request.params = {};
      }
      (request.params as any).workspaceId = workspaceId;
      
      await verifyWorkspaceAccess()(request, reply);
      if (reply.sent) return; // Hook has already responded
    }

    // 3. Owner / Admin bypass project filtering
    const wsRole = request.membership!.role;
    if (wsRole === Role.OWNER || wsRole === Role.ADMIN) {
      request.projectMembership = {
        id: 'workspace-admin-bypass',
        projectId,
        userId: request.user!.userId,
        role: wsRole === Role.OWNER ? Role.OWNER : Role.ADMIN,
      };
    } else {
      // 4. Member / Viewer must be explicitly assigned to this project
      const projMemberResult = await query<{
        id: string;
        project_id: string;
        user_id: string;
        role: string;
      }>(
        'SELECT id, project_id, user_id, role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, request.user.userId]
      );
      const projMembership = projMemberResult.rows[0];

      if (!projMembership) {
        throw new AppError(403, 'Forbidden: You are not a member of this project');
      }

      request.projectMembership = {
        id: projMembership.id,
        projectId: projMembership.project_id,
        userId: projMembership.user_id,
        role: toApiRole(projMembership.role),
      };
    }

    // 5. Enforce write limitations for VIEWER role
    const method = request.method;
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (isWrite) {
      const projRole = request.projectMembership!.role;
      if (projRole === Role.VIEWER) {
        throw new AppError(403, 'Forbidden: Viewers have read-only access and cannot modify resources');
      }
    }
  } catch (error) {
    console.error('[verifyProjectAccess Error]', error);
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const verifyRole = verifyWorkspaceAccess;


