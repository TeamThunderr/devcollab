import { FastifyPluginAsync } from 'fastify';
import { workspaceController } from './workspace.controller';
import { verifyAuth } from '../../middleware/auth.middleware';
import { verifyRole } from '../../middleware/rbac.middleware';
import { Role } from '@prisma/client';

const workspaceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', verifyAuth);

  fastify.post('/', workspaceController.createWorkspace);
  fastify.get('/', workspaceController.getWorkspaces);
  fastify.post('/invites/accept', workspaceController.acceptInvite);

  fastify.get<{ Params: { workspaceId: string } }>('/:workspaceId', { preHandler: [verifyRole([Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER])] }, workspaceController.getDetails as any);
  fastify.get<{ Params: { workspaceId: string } }>('/:workspaceId/members', { preHandler: [verifyRole([Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER])] }, workspaceController.listMembers as any);
  
  fastify.post<{ Params: { workspaceId: string } }>('/:workspaceId/invites', { preHandler: [verifyRole([Role.OWNER, Role.ADMIN])] }, workspaceController.invite as any);
  fastify.patch<{ Params: { workspaceId: string, memberId: string } }>('/:workspaceId/members/:memberId', { preHandler: [verifyRole([Role.OWNER, Role.ADMIN])] }, workspaceController.updateRole as any);
  fastify.delete<{ Params: { workspaceId: string, memberId: string } }>('/:workspaceId/members/:memberId', { preHandler: [verifyRole([Role.OWNER, Role.ADMIN])] }, workspaceController.removeMember as any);
};

export default workspaceRoutes;
