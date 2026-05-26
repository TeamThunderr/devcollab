import { FastifyInstance } from 'fastify';
import { verifyAuth } from '../../middleware/auth.middleware';
import { getPlans } from './payment.controller';

export default async function register(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', verifyAuth);
  fastify.get('/plans', getPlans);
}
