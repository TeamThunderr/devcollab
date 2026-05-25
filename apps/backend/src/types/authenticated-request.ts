import { FastifyRequest } from 'fastify';

export type AuthenticatedRequest = FastifyRequest & {
  user?: {
    userId: string;
    email: string;
    name: string;
    platformRole: 'USER' | 'SUPER_ADMIN';
  };
};
