import { z } from 'zod';

export const createOrderSchema = z.object({
  workspaceId: z.string().uuid()
});

export const verifyPaymentSchema = z.object({
  workspaceId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string()
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
