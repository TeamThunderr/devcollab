import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useBillingStore } from '../../stores/billingStore';
import useAuthStore from '../../stores/authStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import PricingCard from '../../components/billing/PricingCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { canManageBilling } from '../../lib/permissions';

export default function BillingPage(): React.ReactElement {
  const { workspaceId } = useParams();
  const { user } = useAuthStore();
  const { activeWorkspace, members, fetchWorkspaceDetails } = useWorkspaceStore();
  
  const { 
    subscription, 
    isLoading, 
    isProcessingPayment, 
    error, 
    fetchSubscription, 
    upgradeToPro 
  } = useBillingStore();

  useEffect(() => {
    if (workspaceId) {
      if (!activeWorkspace || activeWorkspace.id !== workspaceId) {
        fetchWorkspaceDetails(workspaceId).catch(console.error);
      }
      fetchSubscription(workspaceId);
    }
  }, [workspaceId]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const currentUserMember = members.find((m) => m.userId === user?.id);
  const userRole = currentUserMember?.role || 'VIEWER';
  const isAllowed = canManageBilling(userRole);

  if (!isAllowed && members.length > 0) {
    return <Navigate to={`/${workspaceId}/dashboard`} replace />;
  }

  const currentPlan = subscription?.plan || 'FREE';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
          Manage your Billing
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">
          Current Workspace: <span className="font-semibold text-gray-900 dark:text-white">{activeWorkspace?.name || 'Loading...'}</span>
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center max-w-2xl mx-auto">
          {error}
        </div>
      )}

      {currentPlan === 'PRO' && (
        <div className="mb-12 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white shadow-xl max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center">
              <span className="mr-2">🎉</span> You are on the PRO Plan!
            </h2>
            <p className="text-blue-100">
              Your workspace is fully unlocked. Thank you for supporting DevCollab.
            </p>
          </div>
          <div className="mt-6 sm:mt-0 px-6 py-3 bg-white/20 backdrop-blur rounded-lg border border-white/30 font-semibold tracking-wide">
            ACTIVE SUBSCRIPTION
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <PricingCard
          planName="Free Plan"
          price="Free"
          description="Perfect for individuals and small side projects."
          features={[
            "Up to 3 Workspace Members",
            "Basic Real-time Collaboration",
            "Standard Code Editor",
            "Community Support"
          ]}
          isCurrentPlan={currentPlan === 'FREE'}
          buttonText="Current Plan"
          onAction={() => {}}
        />

        <PricingCard
          planName="Pro Plan"
          price="₹999"
          description="Everything you need for professional teams."
          features={[
            "Unlimited Workspace Members",
            "Advanced AI Assistant Limits",
            "Priority WebSocket Connections",
            "Premium Email Support",
            "Export Projects & Snippets"
          ]}
          isCurrentPlan={currentPlan === 'PRO'}
          isPopular={true}
          isLoading={isProcessingPayment}
          buttonText={isProcessingPayment ? 'Processing...' : 'Upgrade to Pro'}
          onAction={() => {
            if (workspaceId && user) {
              upgradeToPro(workspaceId, user.email, user.name ?? undefined);
            }
          }}
        />
      </div>
    </div>
  );
}
