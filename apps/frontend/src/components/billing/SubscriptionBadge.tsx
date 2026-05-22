import React from 'react';

interface SubscriptionBadgeProps {
  plan: 'FREE' | 'PRO';
  className?: string;
}

export default function SubscriptionBadge({ plan, className = '' }: SubscriptionBadgeProps): React.ReactElement | null {
  if (plan === 'FREE') return null; // We only show the badge for PRO users to keep UI clean, or we could show a grey FREE badge.

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm ${className}`}>
      PRO
    </span>
  );
}
