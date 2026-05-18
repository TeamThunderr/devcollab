import { FastifyRequest, FastifyReply } from 'fastify';

export async function createProject(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: create project under workspace
}

export async function listProjects(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: list projects in workspace
}

export async function getProject(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: get project by id
}

export async function updateProject(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: update project metadata
}

export async function deleteProject(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: delete project and tasks
}
