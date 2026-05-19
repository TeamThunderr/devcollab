import { FastifyRequest } from "fastify";

export type AuthenticatedRequest = FastifyRequest & {
  user?: {
    id?: string;
    role?: string;
    [key: string]: unknown;
  };
};
