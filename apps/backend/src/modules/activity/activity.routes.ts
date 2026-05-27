import { FastifyPluginAsync } from 'fastify';
import { activityController } from './activity.controller';
import { verifyAuth } from '../../middleware/auth.middleware';
import { Role, verifyRole } from '../../middleware/rbac.middleware';

const activityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', verifyAuth);

  // Users must be part of the workspace (any role) to view the activity feed
  fastify.get<{ Params: { workspaceId: string } }>(
    '/:workspaceId', 
    { preHandler: [verifyRole([Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER])] }, 
    activityController.getWorkspaceActivity as any
  );

  // Project-scoped activity — any authenticated user (access checked in service)
  fastify.get<{ Params: { projectId: string } }>(
    '/project/:projectId',
    activityController.getProjectActivity as any
  );
};

export default activityRoutes;
