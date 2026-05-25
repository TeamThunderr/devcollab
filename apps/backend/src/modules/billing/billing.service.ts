import Razorpay from 'razorpay';
import crypto from 'crypto';
import { query, transaction } from '../../db/client';
import { AppError } from '../../utils/errors';
import { CreateOrderInput, VerifyPaymentInput } from './billing.schema';
import { activityService } from '../activity/activity.service';
import { notificationService } from '../notification/notification.service';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
});

const PRO_PLAN_PRICE = 999;
const CURRENCY = 'INR';

function mapSubscription(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    plan: (row.type ?? row.plan ?? 'free').toUpperCase(),
    status: 'ACTIVE',
    currentPeriodEnd: row.expires_at?.toISOString?.() ?? row.expires_at ?? null,
    razorpaySubscriptionId: row.razorpay_payment_id ?? null,
    createdAt: row.started_at?.toISOString?.() ?? row.started_at ?? null,
    updatedAt: row.started_at?.toISOString?.() ?? row.started_at ?? null,
  };
}

async function requireOwner(workspaceId: string, userId: string) {
  const result = await query<{ role: string }>(
    `SELECT role
     FROM workspace_members
     WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  if (result.rows[0]?.role !== 'owner') {
    throw new AppError(403, 'Only workspace owners can upgrade the plan');
  }
}

export const billingService = {
  async createOrder(userId: string, data: CreateOrderInput) {
    await requireOwner(data.workspaceId, userId);

    const workspace = await query<{ plan: string }>('SELECT plan FROM workspaces WHERE id = $1', [data.workspaceId]);
    if (workspace.rows[0]?.plan === 'pro') {
      throw new AppError(400, 'Workspace is already on PRO plan');
    }

    let order;
    try {
      order = await razorpay.orders.create({
        amount: PRO_PLAN_PRICE * 100,
        currency: CURRENCY,
        receipt: `rcpt_${data.workspaceId.substring(0, 8)}_${Date.now()}`,
      });
    } catch (err: any) {
      throw new AppError(400, `Payment gateway error: ${err.error?.description || err.message || 'Failed to create order'}`);
    }

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  },

  async verifyPayment(userId: string, data: VerifyPaymentInput) {
    await requireOwner(data.workspaceId, userId);

    const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(data.razorpayOrderId + '|' + data.razorpayPaymentId)
      .digest('hex');

    if (generatedSignature !== data.razorpaySignature) {
      throw new AppError(400, 'Invalid payment signature. Verification failed.');
    }

    const subscription = await transaction(async (client) => {
      await client.query('UPDATE workspaces SET plan = $1, updated_at = NOW() WHERE id = $2', ['pro', data.workspaceId]);
      const existing = await client.query(
        `SELECT id, workspace_id, type, razorpay_payment_id, started_at, expires_at
         FROM plans
         WHERE workspace_id = $1
         ORDER BY started_at DESC
         LIMIT 1`,
        [data.workspaceId]
      );

      if (existing.rows[0]) {
        const updated = await client.query(
          `UPDATE plans
           SET type = 'pro', razorpay_payment_id = $2, started_at = NOW()
           WHERE id = $1
           RETURNING id, workspace_id, type, razorpay_payment_id, started_at, expires_at`,
          [existing.rows[0].id, data.razorpayPaymentId]
        );
        return updated.rows[0];
      }

      const created = await client.query(
        `INSERT INTO plans (workspace_id, type, razorpay_payment_id)
         VALUES ($1, 'pro', $2)
         RETURNING id, workspace_id, type, razorpay_payment_id, started_at, expires_at`,
        [data.workspaceId, data.razorpayPaymentId]
      );
      return created.rows[0];
    });

    await activityService.createActivity({
      workspaceId: data.workspaceId,
      userId,
      action: 'PLAN_UPGRADED',
      entityType: 'WORKSPACE',
      entityId: data.workspaceId,
      metadata: { plan: 'PRO', paymentId: data.razorpayPaymentId },
    });

    await notificationService.createNotification({
      userId,
      type: 'assignment',
      message: 'Congratulations! Your workspace is now on the PRO plan.',
      metadata: { workspaceId: data.workspaceId },
    });

    return mapSubscription(subscription);
  },

  async getSubscription(workspaceId: string) {
    const result = await query(
      `SELECT id, workspace_id, type, razorpay_payment_id, started_at, expires_at
       FROM plans
       WHERE workspace_id = $1
       ORDER BY started_at DESC
       LIMIT 1`,
      [workspaceId]
    );

    if (result.rows[0]) {
      return mapSubscription(result.rows[0]);
    }

    const workspace = await query<{ id: string; plan: string; created_at: Date }>(
      `SELECT id, plan, created_at
       FROM workspaces
       WHERE id = $1`,
      [workspaceId]
    );
    if (!workspace.rows[0]) {
      throw new AppError(404, 'Subscription not found');
    }

    return {
      id: workspace.rows[0].id,
      workspaceId: workspace.rows[0].id,
      plan: workspace.rows[0].plan.toUpperCase(),
      status: 'ACTIVE',
      currentPeriodEnd: null,
      razorpaySubscriptionId: null,
      createdAt: workspace.rows[0].created_at.toISOString(),
      updatedAt: workspace.rows[0].created_at.toISOString(),
    };
  },
};
