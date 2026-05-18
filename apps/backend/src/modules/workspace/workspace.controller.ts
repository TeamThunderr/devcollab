import { FastifyRequest, FastifyReply } from 'fastify';

export async function createWorkspace(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: create workspace
}

export async function listWorkspaces(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: list workspaces for authenticated user
}

export async function getWorkspace(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: get workspace by slug
}

export async function updateWorkspace(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: update workspace settings
}

export async function deleteWorkspace(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: delete workspace and all sub-resources
}

export async function inviteMember(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: invite user to workspace by email
}

export async function removeMember(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: remove member from workspace
}

export async function listMembers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: list all workspace members with roles
}
