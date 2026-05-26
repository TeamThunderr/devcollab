import { FastifyRequest, FastifyReply } from 'fastify';
import { workspaceService } from './workspace.service';
import { createWorkspaceSchema, inviteMemberSchema, acceptInviteSchema, updateRoleSchema } from './workspace.schema';
import { AppError } from '../../utils/errors';

export const workspaceController = {
  async createWorkspace(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createWorkspaceSchema.parse(request.body);
      const workspace = await workspaceService.createWorkspace(request.user!.userId, data);
      return reply.status(201).send(workspace);
    } catch (error: any) {
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async getWorkspaces(request: FastifyRequest, reply: FastifyReply) {
    try {
      const workspaces = await workspaceService.getUserWorkspaces(request.user!.userId);
      return reply.send(workspaces);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async getDetails(request: FastifyRequest<{ Params: { workspaceId: string } }>, reply: FastifyReply) {
    try {
      const workspace = await workspaceService.getWorkspaceDetails(request.params.workspaceId);
      return reply.send(workspace);
    } catch (error: any) {
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async invite(request: FastifyRequest<{ Params: { workspaceId: string } }>, reply: FastifyReply) {
    try {
      const data = inviteMemberSchema.parse(request.body);
      const invite = await workspaceService.inviteMember(request.params.workspaceId, request.user!.userId, data);
      return reply.status(201).send({ message: 'Invite sent', invite });
    } catch (error: any) {
      console.error('INVITE ERROR:', error);
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async acceptInvite(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = acceptInviteSchema.parse(request.body);
      const membership = await workspaceService.acceptInvite(request.user!.userId, request.user!.email, data);
      return reply.send({ message: 'Invite accepted', membership });
    } catch (error: any) {
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async listMembers(request: FastifyRequest<{ Params: { workspaceId: string } }>, reply: FastifyReply) {
    try {
      const members = await workspaceService.listMembers(request.params.workspaceId);
      return reply.send(members);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async updateRole(request: FastifyRequest<{ Params: { workspaceId: string, memberId: string } }>, reply: FastifyReply) {
    try {
      const data = updateRoleSchema.parse(request.body);
      const membership = await workspaceService.updateMemberRole(request.params.workspaceId, request.params.memberId, data.role, request.membership);
      return reply.send(membership);
    } catch (error: any) {
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async removeMember(request: FastifyRequest<{ Params: { workspaceId: string, memberId: string } }>, reply: FastifyReply) {
    try {
      await workspaceService.removeMember(request.params.workspaceId, request.params.memberId, request.membership);
      return reply.send({ message: 'Member removed successfully' });
    } catch (error: any) {
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
};
