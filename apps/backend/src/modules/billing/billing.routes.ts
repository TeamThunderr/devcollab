import { FastifyPluginAsync } from 'fastify';
import { billingController } from './billing.controller';
import { verifyAuth } from '../../middleware/auth.middleware';
import { Role, verifyRole } from '../../middleware/rbac.middleware';

const billingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', verifyAuth);

  fastify.post('/orders', billingController.createOrder as any);
  fastify.post('/verify', billingController.verifyPayment as any);
  
  fastify.get<{ Params: { workspaceId: string } }>(
    '/:workspaceId',
    { preHandler: [verifyRole([Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER])] },
    billingController.getSubscription as any
  );
};

export default billingRoutes;
