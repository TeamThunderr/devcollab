import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

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
  iconBg?: string;
  /** AI prompt chips shown below CTA */
  suggestedPrompts?: Array<{ label: string; onClick: () => void }>;
}

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  cta,
  className,
  iconBg = 'bg-[#1F2937]',
  suggestedPrompts,
}: EmptyStateProps): React.ReactElement {
  const CtaIcon = cta?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-8 text-center relative overflow-hidden',
        className,
      )}
    >
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${10 + i * 16}%`,
            top: `${15 + (i % 3) * 25}%`,
            background: i % 2 === 0 ? 'rgba(124,58,237,0.5)' : 'rgba(59,130,246,0.4)',
          }}
          animate={{
            y: [-6, 6, -6],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.35 }}
        />
      ))}

      {/* Icon container with glow */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
        className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative',
          iconBg,
        )}
      >
        <div className="absolute inset-0 rounded-2xl bg-[#7C3AED]/10 blur-lg animate-pulse" />
        <Icon className="w-8 h-8 text-[#4B5563] relative z-10" />
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="text-base font-semibold text-[#F9FAFB] mb-2">{title}</h3>
        <p className="text-sm text-[#4B5563] max-w-xs leading-relaxed mb-6">{subtitle}</p>
      </motion.div>

      {/* CTA */}
      {cta && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          type="button"
          onClick={cta.onClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold
                     transition-all duration-200 hover:shadow-[0_0_20px_rgba(124,58,237,0.35)]
                     hover:-translate-y-0.5"
        >
          {CtaIcon && <CtaIcon className="w-4 h-4" />}
          {cta.label}
        </motion.button>
      )}

      {/* AI suggested prompts */}
      {suggestedPrompts && suggestedPrompts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-2 mt-4"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt.label}
              onClick={prompt.onClick}
              className="px-3 py-1 rounded-full text-[11px] font-medium
                         bg-[#111827] border border-[#1F2937] text-[#9CA3AF]
                         hover:text-white hover:border-[#7C3AED]/40
                         transition-all duration-150"
            >
              {prompt.label}
            </button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
