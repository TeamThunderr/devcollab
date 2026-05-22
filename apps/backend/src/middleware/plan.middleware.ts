import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/errors';
import { Plan } from '@prisma/client';

export const requirePlan = (requiredPlan: Plan) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { workspaceId } = request.params as { workspaceId?: string };
      
      if (!workspaceId) {
        throw new AppError(400, 'Bad Request: workspaceId is required');
      }

      const subscription = await prisma.subscription.findUnique({
        where: { workspaceId }
      });

      if (!subscription) {
        throw new AppError(404, 'Workspace subscription not found');
      }

      if (requiredPlan === Plan.PRO && subscription.plan !== Plan.PRO) {
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
