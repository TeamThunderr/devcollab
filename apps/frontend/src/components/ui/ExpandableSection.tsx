import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * ExpandableSection
 * Framer Motion height animation — smooth expand/collapse.
 * Used in TaskBreakdownPanel, WikiPlanPanel, activity grouping.
 */
export default function ExpandableSection({
  title,
  children,
  defaultOpen = false,
  badge,
  icon,
  className,
}: ExpandableSectionProps): React.ReactElement {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className={cn('border border-[#1F2937] rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left
                   bg-[#111827] hover:bg-[#141E33] transition-colors duration-150"
      >
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="text-[#9CA3AF]">{icon}</span>
          )}
          <span className="text-sm font-semibold text-[#F9FAFB]">{title}</span>
          {badge !== undefined && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold
                             bg-[#1F2937] text-[#9CA3AF]">
              {badge}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-4 h-4 text-[#4B5563]" />
        </motion.div>
      </button>

      {/* Content — animated height */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 py-3 border-t border-[#1F2937] bg-[#0F1629]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
