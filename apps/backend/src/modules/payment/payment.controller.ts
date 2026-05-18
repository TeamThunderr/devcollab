import { FastifyRequest, FastifyReply } from 'fastify';

export async function createOrder(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: create Razorpay order
}

export async function verifyPayment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: verify Razorpay payment signature and activate subscription
}

export async function getSubscription(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: return current subscription for workspace
}

export async function cancelSubscription(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: cancel active subscription
}

export async function getPlans(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // TODO: return available pricing plans
}
