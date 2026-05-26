import { FastifyRequest, FastifyReply } from 'fastify';

export async function getSuggestion(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  reply.status(404).send({ error: 'Route is not registered' });
}

export async function reviewCode(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  reply.status(404).send({ error: 'Route is not registered' });
}

export async function explainCode(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  reply.status(404).send({ error: 'Route is not registered' });
}

export async function generateCode(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  reply.status(404).send({ error: 'Route is not registered' });
}
