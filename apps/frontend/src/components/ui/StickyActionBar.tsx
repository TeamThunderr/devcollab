import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface StickyActionBarProps {
  title: string;
  triggerRef: React.RefObject<HTMLElement>;
  children?: React.ReactNode;
  className?: string;
}

/**
 * StickyActionBar
 * Slides down from top when the page header scrolls out of view.
 * Uses IntersectionObserver on a sentinel element for zero scroll jank.
 */
export default function StickyActionBar({
  title,
  triggerRef,
  children,
  className,
}: StickyActionBarProps): React.ReactElement {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-56px 0px 0px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [triggerRef]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className={cn(
            'sticky top-0 z-30 flex items-center justify-between px-6 py-2.5',
            'glass-topbar',
            className,
          )}
        >
          <span className="text-sm font-semibold text-white">{title}</span>
          <div className="flex items-center gap-2">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
