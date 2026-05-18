import { FastifyRequest, FastifyReply } from 'fastify';

export async function getSuggestion(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: stream Claude AI code suggestion
}

export async function reviewCode(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: stream AI code review
}

export async function explainCode(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: stream AI code explanation
}

export async function generateCode(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: stream AI code generation from prompt
}
