import { FastifyRequest, FastifyReply } from 'fastify';

export function requireRole(role: string) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // TODO: check request.user.role against required role
    void role;
    void request;
    void reply;
  };
}
