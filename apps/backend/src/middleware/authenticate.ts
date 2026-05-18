import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: verify JWT access token from Authorization header or cookie
  // TODO: attach decoded user to request object
  void reply;
  void request;
}
