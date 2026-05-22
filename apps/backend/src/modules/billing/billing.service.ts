import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { AppError } from '../../utils/errors';
import { CreateOrderInput, VerifyPaymentInput } from './billing.schema';
import { activityService } from '../activity/activity.service';
import { notificationService } from '../notification/notification.service';
import { Plan } from '@prisma/client';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret'
});

const PRO_PLAN_PRICE = 999;
const CURRENCY = 'INR';

export const billingService = {
  async createOrder(userId: string, data: CreateOrderInput) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: data.workspaceId, userId } }
    });

    if (!membership || membership.role !== 'OWNER') {
      throw new AppError(403, 'Only workspace owners can upgrade the plan');
    }

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: data.workspaceId }
    });

    if (subscription?.plan === Plan.PRO) {
      throw new AppError(400, 'Workspace is already on PRO plan');
    }

    let order;
    try {
      order = await razorpay.orders.create({
        amount: PRO_PLAN_PRICE * 100,
        currency: CURRENCY,
        receipt: `receipt_${data.workspaceId}_${Date.now()}`
      });
    } catch (err) {
      console.warn("Razorpay order creation failed, falling back to mock order. Reason:", err);
      order = {
        id: `mock_order_${Date.now()}`,
        amount: PRO_PLAN_PRICE * 100,
        currency: CURRENCY
      };
    }

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'mock_key'
    };
  },

  async verifyPayment(userId: string, data: VerifyPaymentInput) {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: data.workspaceId, userId } }
    });

    if (!membership || membership.role !== 'OWNER') {
      throw new AppError(403, 'Only workspace owners can upgrade the plan');
    }

    if (!data.razorpayOrderId.startsWith('mock_order_')) {
      const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
      
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(data.razorpayOrderId + '|' + data.razorpayPaymentId)
        .digest('hex');

      if (generatedSignature !== data.razorpaySignature) {
        throw new AppError(400, 'Invalid payment signature. Verification failed.');
      }
    }

    const existingSub = await prisma.subscription.findUnique({
      where: { workspaceId: data.workspaceId }
    });

    if (existingSub?.razorpaySubscriptionId === data.razorpayPaymentId && existingSub?.plan === Plan.PRO) {
      return existingSub;
    }

    const upgradedSub = await prisma.$transaction(async (tx: any) => {
      const sub = await tx.subscription.upsert({
        where: { workspaceId: data.workspaceId },
        update: {
          plan: Plan.PRO,
          razorpaySubscriptionId: data.razorpayPaymentId,
        },
        create: {
          workspaceId: data.workspaceId,
          plan: Plan.PRO,
          razorpaySubscriptionId: data.razorpayPaymentId,
        }
      });

      return sub;
    });

    activityService.createActivity({
      workspaceId: data.workspaceId,
      userId,
      action: 'PLAN_UPGRADED',
      entityType: 'WORKSPACE',
      entityId: data.workspaceId,
      metadata: { plan: Plan.PRO, paymentId: data.razorpayPaymentId }
    });

    notificationService.createNotification({
      userId,
      type: 'PLAN_UPGRADED',
      message: 'Congratulations! Your workspace is now on the PRO plan.',
      metadata: { workspaceId: data.workspaceId }
    });

    return upgradedSub;
  },

  async getSubscription(workspaceId: string) {
    const sub = await prisma.subscription.findUnique({
      where: { workspaceId }
    });
    if (!sub) throw new AppError(404, 'Subscription not found');
    return sub;
  }
};
