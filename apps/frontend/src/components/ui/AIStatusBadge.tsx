import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

type AIStatus = 'ready' | 'thinking' | 'streaming' | 'offline';

interface AIStatusBadgeProps {
  status?: AIStatus;
  className?: string;
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<AIStatus, {
  label: string;
  dotColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  pulseColor: string;
}> = {
  ready: {
    label: 'AI Ready',
    dotColor: 'bg-emerald-400',
    textColor: 'text-emerald-300',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    pulseColor: 'bg-emerald-400',
  },
  thinking: {
    label: 'AI Thinking',
    dotColor: 'bg-amber-400',
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    pulseColor: 'bg-amber-400',
  },
  streaming: {
    label: 'Generating',
    dotColor: 'bg-violet-400',
    textColor: 'text-violet-300',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    pulseColor: 'bg-violet-400',
  },
  offline: {
    label: 'AI Offline',
    dotColor: 'bg-slate-500',
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/20',
    pulseColor: 'bg-slate-500',
  },
};

/**
 * AIStatusBadge
 * Pulsing indicator showing AI readiness state.
 * Used in Topbar, AI panel headers, and command palette.
 */
export default function AIStatusBadge({
  status = 'ready',
  className,
  showLabel = true,
}: AIStatusBadgeProps): React.ReactElement {
  const cfg = STATUS_CONFIG[status];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
          'border',
          cfg.bgColor,
          cfg.borderColor,
          cfg.textColor,
          className,
        )}
      >
        {/* Pulsing dot */}
        <span className="relative flex h-1.5 w-1.5">
          {(status === 'ready' || status === 'thinking' || status === 'streaming') && (
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                cfg.pulseColor,
              )}
            />
          )}
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', cfg.dotColor)} />
        </span>

        {/* Label — thinking gets animated dots */}
        {showLabel && (
          <span>
            {status === 'thinking' ? (
              <span className="flex items-center gap-0.5">
                AI Thinking
                <span className="ml-1 inline-flex gap-0.5">
                  <span className="ai-thinking-dot" />
                  <span className="ai-thinking-dot" />
                  <span className="ai-thinking-dot" />
                </span>
              </span>
            ) : status === 'streaming' ? (
              <span className="flex items-center gap-1">
                Generating
                <span className="ai-cursor" />
              </span>
            ) : (
              cfg.label
            )}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
