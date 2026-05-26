import React from 'react';
import { motion } from 'framer-motion';

/**
 * AmbientBackground
 * Slow-drifting gradient blobs giving the workspace a cinematic, living feel.
 * Pointer-events none — purely decorative. Place inside a relative container.
 */
export default function AmbientBackground(): React.ReactElement {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Blob 1 — Violet, top-left */}
      <motion.div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          x: [0, 30, -10, 20, 0],
          y: [0, -20, 15, -8, 0],
          scale: [1, 1.06, 0.96, 1.03, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Blob 2 — Blue, top-right */}
      <motion.div
        className="absolute -top-20 right-0 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={{
          x: [0, -25, 10, -15, 0],
          y: [0, 20, -10, 15, 0],
          scale: [1, 0.95, 1.08, 0.98, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Blob 3 — Cyan, bottom-center */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.04) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 40, -20, 30, 0],
          scale: [1, 1.1, 0.94, 1.05, 1],
          opacity: [0.6, 0.9, 0.6, 0.8, 0.6],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
