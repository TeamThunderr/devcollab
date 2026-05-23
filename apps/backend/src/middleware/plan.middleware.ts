import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db/client';
import { AppError } from '../utils/errors';

export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
}

export const requirePlan = (requiredPlan: Plan) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { workspaceId } = request.params as { workspaceId?: string };
      if (!workspaceId) {
        throw new AppError(400, 'Bad Request: workspaceId is required');
      }

      const result = await query<{ plan: string }>('SELECT plan FROM workspaces WHERE id = $1', [workspaceId]);
      const workspace = result.rows[0];
      if (!workspace) {
        throw new AppError(404, 'Workspace not found');
      }

      if (requiredPlan === Plan.PRO && workspace.plan !== 'pro') {
        throw new AppError(403, 'This action requires a PRO subscription');
      }
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  };
};
