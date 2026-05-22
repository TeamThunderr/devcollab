import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/errors';
import { Role, WorkspaceMember } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    membership?: WorkspaceMember;
  }
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

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: request.user.userId,
          }
        }
      });

      if (!membership) {
        throw new AppError(403, 'Forbidden: You are not a member of this workspace');
      }

      if (!allowedRoles.includes(membership.role)) {
        throw new AppError(403, `Forbidden: Requires one of roles: ${allowedRoles.join(', ')}`);
      }

      request.membership = membership;
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  };
};
