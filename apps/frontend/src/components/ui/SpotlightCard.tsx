import React, { useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
  id?: string;
}

/**
 * SpotlightCard
 * Raycast-style spotlight that follows the cursor within the card.
 * Pure CSS approach — no Framer Motion overhead.
 */
export default function SpotlightCard({
  children,
  className,
  glowColor = 'rgba(124,58,237,0.12)',
  onClick,
  id,
}: SpotlightCardProps): React.ReactElement {
  const divRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || !overlayRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    overlayRef.current.style.background = `radial-gradient(circle 160px at ${x}px ${y}px, ${glowColor}, transparent 70%)`;
    overlayRef.current.style.opacity = '1';
  }, [glowColor]);

  const handleMouseLeave = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.style.opacity = '0';
    }
  }, []);

  return (
    <div
      id={id}
      ref={divRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[#1F2937] bg-[#111827]',
        'transition-[border-color,box-shadow,transform] duration-200',
        'hover:border-[#7C3AED]/30',
        'hover:shadow-[0_8px_32px_rgba(0,0,0,0.35),0_0_0_1px_rgba(124,58,237,0.10)]',
        'hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {/* Spotlight overlay */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200"
        style={{ opacity: 0 }}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
