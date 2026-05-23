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

declare module 'fastify' {
  interface FastifyRequest {
    membership?: WorkspaceMembership;
  }
}

function toApiRole(role: string): Role {
  return role.toUpperCase() as Role;
}

export const verifyRole = (allowedRoles: Role[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.user) {
        throw new AppError(401, 'Unauthorized: Please authenticate first');
      }

      const { workspaceId } = request.params as { workspaceId?: string };
      if (!workspaceId) {
        throw new AppError(400, 'Bad Request: workspaceId is required in parameters');
      }

      const result = await query<{
        id: string;
        workspace_id: string;
        user_id: string;
        role: string;
        joined_at: Date;
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
      if (!allowedRoles.includes(apiRole)) {
        throw new AppError(403, `Forbidden: Requires one of roles: ${allowedRoles.join(', ')}`);
      }

      request.membership = {
        id: membership.id,
        workspaceId: membership.workspace_id,
        userId: membership.user_id,
        role: apiRole,
        joinedAt: membership.joined_at.toISOString(),
      };
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  };
};
