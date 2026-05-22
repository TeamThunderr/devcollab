import { create } from 'zustand';
import { Subscription } from '../types';
import { billingService } from '../services/api/billing.service';

interface BillingStore {
  subscription: Subscription | null;
  isLoading: boolean;
  isProcessingPayment: boolean;
  error: string | null;

  fetchSubscription: (workspaceId: string) => Promise<void>;
  upgradeToPro: (workspaceId: string, userEmail: string, userName?: string) => Promise<void>;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const useBillingStore = create<BillingStore>((set) => ({
  subscription: null,
  isLoading: false,
  isProcessingPayment: false,
  error: null,

  fetchSubscription: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const sub = await billingService.getSubscription(workspaceId);
      set({ subscription: sub, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || error.message || 'Failed to fetch subscription', 
        isLoading: false 
      });
    }
  },

  upgradeToPro: async (workspaceId: string, userEmail: string, userName?: string) => {
    set({ isProcessingPayment: true, error: null });
    try {
      // 1. Create Order on backend
      const order = await billingService.createOrder(workspaceId);

      // 2. Load Razorpay script dynamically
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Are you offline?');
      }

      // 3. Open Razorpay Modal
      if (order.id.startsWith('mock_order_')) {
        // Simulate successful checkout for mock orders (e.g. invalid keys in dev)
        setTimeout(async () => {
          try {
            const verifyRes = await billingService.verifyPayment({
              workspaceId,
              razorpayOrderId: order.id,
              razorpayPaymentId: `mock_payment_${Date.now()}`,
              razorpaySignature: 'mock_signature'
            });
            set({ subscription: verifyRes.subscription, isProcessingPayment: false });
          } catch (verifyError: any) {
            set({ 
              error: verifyError.response?.data?.error || 'Mock verification failed', 
              isProcessingPayment: false 
            });
          }
        }, 1500);
        return;
      }

      const options = {
        key: order.keyId, // Fetched securely from the backend createOrder response
        amount: order.amount,
        currency: order.currency,
        name: 'DevCollab Pro',
        description: 'Upgrade to DevCollab Pro',
        order_id: order.id,
        handler: async function (response: any) {
          try {
            // 4. Verify Payment with backend
            const verifyRes = await billingService.verifyPayment({
              workspaceId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            
            // 5. Update UI State automatically
            set({ subscription: verifyRes.subscription, isProcessingPayment: false });
          } catch (verifyError: any) {
            set({ 
              error: verifyError.response?.data?.error || 'Payment verification failed.', 
              isProcessingPayment: false 
            });
          }
        },
        prefill: {
          name: userName || '',
          email: userEmail
        },
        theme: {
          color: '#3B82F6' // Tailwind blue-500
        },
        modal: {
          ondismiss: function () {
            set({ isProcessingPayment: false });
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        set({ error: response.error.description, isProcessingPayment: false });
      });
      rzp.open();

    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || error.message || 'Failed to initiate payment', 
        isProcessingPayment: false 
      });
    }
  }
}));
