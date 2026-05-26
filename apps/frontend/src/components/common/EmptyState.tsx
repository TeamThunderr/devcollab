import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  cta?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  /** icon container background — defaults to bg-gray-800 */
  iconBg?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  cta,
  className,
  iconBg = 'bg-gray-800',
}: EmptyStateProps): React.ReactElement {
  const CtaIcon = cta?.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-8 text-center',
        className,
      )}
    >
      {/* Icon container */}
      <div
        className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
          iconBg,
        )}
      >
        <Icon className="w-8 h-8 text-gray-500" />
      </div>

      {/* Text */}
      <h3 className="text-base font-medium text-gray-300 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
        {subtitle}
      </p>

      {/* CTA */}
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          {CtaIcon && <CtaIcon className="w-4 h-4" />}
          {cta.label}
        </button>
      )}
    </div>
  );
}
