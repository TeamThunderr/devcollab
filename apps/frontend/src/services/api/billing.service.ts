import api from '../../lib/axios';
import { Subscription, VerifyPaymentPayload } from '../../types';

export const billingService = {
  getSubscription: async (workspaceId: string) => {
    const response = await api.get<Subscription>(`/api/billing/${workspaceId}`);
    return response.data;
  },

  createOrder: async (workspaceId: string) => {
    const response = await api.post<{ id: string; amount: number; currency: string; keyId: string }>('/api/billing/orders', { workspaceId });
    return response.data;
  },

  verifyPayment: async (payload: VerifyPaymentPayload) => {
    const response = await api.post<{ message: string; subscription: Subscription }>('/api/billing/verify', payload);
    return response.data;
  }
};
