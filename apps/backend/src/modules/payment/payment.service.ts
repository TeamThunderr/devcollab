import { pool } from '../../db/client';

export async function createRazorpayOrder(): Promise<void> {
  // TODO: call Razorpay API to create order
  void pool;
}

export async function verifyRazorpayPayment(): Promise<void> {
  // TODO: verify HMAC signature and activate subscription in DB
}

export async function getSubscription(): Promise<void> {
  // TODO: fetch active subscription for workspace
}

export async function cancelSubscription(): Promise<void> {
  // TODO: cancel subscription via Razorpay API and update DB
}

export async function getPlans(): Promise<void> {
  // TODO: return static or DB-driven pricing plans
}
