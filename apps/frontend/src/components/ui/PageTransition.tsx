import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition
 * Wraps <Outlet> content with smooth enter/exit animations.
 * Use AnimatePresence mode='wait' keyed on pathname.
 */
export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{
          duration: 0.18,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
