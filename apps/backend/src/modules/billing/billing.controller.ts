import { FastifyRequest, FastifyReply } from 'fastify';
import { billingService } from './billing.service';
import { createOrderSchema, verifyPaymentSchema } from './billing.schema';
import { AppError } from '../../utils/errors';

export const billingController = {
  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createOrderSchema.parse(request.body);
      const order = await billingService.createOrder(request.user!.userId, data);
      return reply.status(201).send(order);
    } catch (error: any) {
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async verifyPayment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = verifyPaymentSchema.parse(request.body);
      const sub = await billingService.verifyPayment(request.user!.userId, data);
      return reply.send({ message: 'Payment verified successfully', subscription: sub });
    } catch (error: any) {
      if (error.name === 'ZodError') return reply.status(400).send({ error: error.errors });
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  },

  async getSubscription(request: FastifyRequest<{ Params: { workspaceId: string } }>, reply: FastifyReply) {
    try {
      const sub = await billingService.getSubscription(request.params.workspaceId);
      return reply.send(sub);
    } catch (error: any) {
      if (error instanceof AppError) return reply.status(error.statusCode).send({ error: error.message });
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
};
