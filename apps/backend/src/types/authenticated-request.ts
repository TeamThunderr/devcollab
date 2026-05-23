import { FastifyRequest } from 'fastify';

export type AuthenticatedRequest = FastifyRequest & {
  user?: {
    userId: string;
    email: string;
    name: string;
  };
};
