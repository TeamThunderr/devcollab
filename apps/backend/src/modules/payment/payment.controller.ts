import { FastifyReply, FastifyRequest } from 'fastify';
import * as paymentService from './payment.service';

export async function getPlans(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const plans = await paymentService.getPlans();
  reply.send({ plans });
}
