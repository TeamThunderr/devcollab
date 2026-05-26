import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays, addDays, format } from 'date-fns';
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
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
    return <Navigate to={`/w/${workspaceId}`} replace />;
  }

  const currentPlan = subscription?.plan || 'FREE';
  
  const getSubscriptionDetails = () => {
    if (!subscription || currentPlan !== 'PRO') return null;
    const start = new Date(subscription.createdAt);
    // If backend hasn't populated currentPeriodEnd yet, fallback to 30 days from creation
    const end = subscription.currentPeriodEnd 
      ? new Date(subscription.currentPeriodEnd) 
      : addDays(start, 30);
    const daysLeft = Math.max(0, differenceInDays(end, new Date()));
    return { start, end, daysLeft };
  };
  const subDetails = getSubscriptionDetails();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-6xl mx-auto px-4 py-8 md:py-12 relative"
    >
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

      <AnimatePresence>
        {currentPlan === 'PRO' && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mb-12 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between border border-blue-400/30"
          >
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  🎉
                </motion.span> 
                Workspace upgraded to PRO!
              </h2>
              <p className="text-blue-100 font-medium">
                Your workspace is fully unlocked. Thank you for supporting DevCollab.
              </p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (subDetails && subDetails.daysLeft <= 10 && workspaceId && user) {
                  upgradeToPro(workspaceId, user.email, user.name ?? undefined);
                } else {
                  setIsDetailsOpen(true);
                }
              }}
              className={`mt-6 sm:mt-0 px-6 py-3 backdrop-blur rounded-lg border font-bold tracking-widest text-sm transition-colors ${
                subDetails && subDetails.daysLeft <= 10
                  ? 'bg-amber-500 hover:bg-amber-600 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'bg-white/20 hover:bg-white/30 border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
              }`}
            >
              {isProcessingPayment 
                ? 'PROCESSING...' 
                : subDetails && subDetails.daysLeft <= 10 
                  ? 'EXTEND SUBSCRIPTION' 
                  : 'ACTIVE SUBSCRIPTION'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

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
          buttonText={currentPlan === 'FREE' ? 'Current Plan' : 'Downgrade to Free'}
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
          isCurrentPlan={currentPlan === 'PRO' && (!subDetails || subDetails.daysLeft > 10)}
          isPopular={true}
          isLoading={isProcessingPayment}
          buttonText={
            isProcessingPayment 
              ? 'Processing...' 
              : currentPlan === 'PRO' 
                ? (subDetails && subDetails.daysLeft <= 10 ? 'Extend Subscription' : 'Current Plan') 
                : 'Upgrade to Pro'
          }
          onAction={() => {
            if (workspaceId && user) {
              upgradeToPro(workspaceId, user.email, user.name ?? undefined);
            }
          }}
        />
      </div>

      <AnimatePresence>
        {isDetailsOpen && subDetails && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setIsDetailsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#17191d] border border-white/[0.08] rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>

              <h3 className="text-xl font-extrabold text-white mb-6">Subscription Details</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                  <span className="text-slate-400 text-sm font-medium">Plan</span>
                  <span className="text-blue-400 font-bold tracking-wide uppercase">DevCollab PRO</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                  <span className="text-slate-400 text-sm font-medium">Started On</span>
                  <span className="text-slate-200 font-medium">{format(subDetails.start, 'PPP')}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/[0.04]">
                  <span className="text-slate-400 text-sm font-medium">Renews On</span>
                  <span className="text-slate-200 font-medium">{format(subDetails.end, 'PPP')}</span>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-xl p-5 border border-white/[0.04] text-center mb-6">
                <div className="text-4xl font-black text-white mb-1">{subDetails.daysLeft}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Days Remaining</div>
              </div>

              {subDetails.daysLeft <= 7 ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-400 text-sm font-medium flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <p>Your subscription is ending soon! Please renew before {format(subDetails.end, 'MMM do')} to keep your workspace unlocked.</p>
                </div>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-400 text-sm font-medium flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <p>Your subscription is active and in good standing.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProcessingPayment && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4"
            >
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <h3 className="text-xl font-bold text-white mb-2">Secure Checkout</h3>
              <p className="text-sm text-gray-400 text-center">
                Initializing encrypted payment gateway...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
