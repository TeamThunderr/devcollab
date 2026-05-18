import { FastifyRequest, FastifyReply } from 'fastify';

export async function createPage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: create wiki page
}

export async function listPages(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: list wiki pages in project
}

export async function getPage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: get wiki page by slug
}

export async function updatePage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: update wiki page content and save version
}

export async function deletePage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: delete wiki page
}

export async function getPageHistory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: return version history for a wiki page
}
