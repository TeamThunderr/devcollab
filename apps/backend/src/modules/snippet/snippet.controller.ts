import { FastifyRequest, FastifyReply } from 'fastify';

export async function createSnippet(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: create code snippet
}

export async function listSnippets(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: list snippets in project
}

export async function getSnippet(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: get snippet by id
}

export async function updateSnippet(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: update snippet content and metadata
}

export async function deleteSnippet(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: delete snippet
}
