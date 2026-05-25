import { FastifyPluginAsync } from 'fastify';
import { authController } from './auth.controller';
import { verifyAuth } from '../../middleware/auth.middleware';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', authController.register);
  fastify.post('/login', authController.login);
  fastify.post('/logout', authController.logout);
  fastify.post('/refresh', authController.refresh);
  
  fastify.get('/me', { preHandler: [verifyAuth] }, authController.getMe);
  fastify.patch('/me', { preHandler: [verifyAuth] }, authController.updateMe);
};

export default authRoutes;
