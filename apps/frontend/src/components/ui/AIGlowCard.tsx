import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface AIGlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  enableTilt?: boolean;
  onClick?: () => void;
  id?: string;
}

/**
 * AIGlowCard
 * Premium card with cursor-follow radial glow + subtle 3D tilt effect.
 * Drop-in replacement for plain div wrappers.
 */
export default function AIGlowCard({
  children,
  className,
  glowColor = 'rgba(124,58,237,0.10)',
  enableTilt = true,
  onClick,
  id,
}: AIGlowCardProps): React.ReactElement {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update spotlight position
    card.style.setProperty('--card-x', `${x}px`);
    card.style.setProperty('--card-y', `${y}px`);

    if (enableTilt) {
      // Subtle 3D tilt — max ±3deg
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotateX = ((y - cy) / cy) * -2.5;
      const rotateY = ((x - cx) / cx) * 2.5;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
    }

    // Moving glow overlay
    card.style.setProperty('--glow-x', `${x}px`);
    card.style.setProperty('--glow-y', `${y}px`);
  }, [enableTilt]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)';
  }, []);

  return (
    <motion.div
      id={id}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[#1F2937]',
        'bg-[#111827] transition-[border-color,box-shadow] duration-300',
        'hover:border-[#7C3AED]/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(124,58,237,0.10)]',
        'spotlight-card',
        onClick && 'cursor-pointer',
        className,
      )}
      style={{
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out, border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Cursor-follow glow overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 120px at var(--glow-x, 50%) var(--glow-y, 50%), ${glowColor}, transparent 70%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
