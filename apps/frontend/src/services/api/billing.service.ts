import { apiClient } from './client';
import { Subscription, RazorpayOrder, VerifyPaymentPayload } from '../../types';

export const billingService = {
  getSubscription: async (workspaceId: string) => {
    const response = await apiClient.get<Subscription>(`/billing/${workspaceId}`);
    return response.data;
  },

  createOrder: async (workspaceId: string) => {
    const response = await apiClient.post<{ id: string; amount: number; currency: string; keyId: string }>('/billing/orders', { workspaceId });
    return response.data;
  },

  verifyPayment: async (payload: VerifyPaymentPayload) => {
    const response = await apiClient.post<{ message: string; subscription: Subscription }>('/billing/verify', payload);
    return response.data;
  }
};
