import { FastifyInstance } from 'fastify';
import { waitlistController } from './waitlist.controller';
import { authenticate } from '../../middleware/authenticate';

export default async function register(fastify: FastifyInstance): Promise<void> {
  fastify.register(async (secureFastify) => {
    secureFastify.addHook('onRequest', authenticate);
    secureFastify.post('/join', waitlistController.joinWaitlist);
  });
}
