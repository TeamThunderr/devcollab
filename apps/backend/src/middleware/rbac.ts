import { FastifyRequest, FastifyReply } from 'fastify';

export function requireRole(role: string) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.membership || request.membership.role !== role) {
      reply.status(403).send({ error: `Requires role: ${role}` });
    }
  };
}
