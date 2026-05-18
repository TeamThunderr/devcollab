import { FastifyRequest, FastifyReply } from 'fastify';

export async function listActivities(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: list all activities for authenticated user
}

export async function getWorkspaceActivity(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: list activities scoped to workspace
}

export async function getProjectActivity(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: list activities scoped to project
}
