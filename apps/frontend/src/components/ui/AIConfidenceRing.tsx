import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface AIConfidenceRingProps {
  score: number; // 0–100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  animate?: boolean;
}

function getColor(score: number): { stroke: string; text: string; glow: string } {
  if (score >= 80) return { stroke: '#10B981', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.3)' };
  if (score >= 60) return { stroke: '#F59E0B', text: 'text-amber-400',   glow: 'rgba(245,158,11,0.3)'  };
  return              { stroke: '#EF4444', text: 'text-red-400',     glow: 'rgba(239,68,68,0.3)'    };
}

/**
 * AIConfidenceRing
 * SVG circular progress ring showing AI confidence score.
 * Animates strokeDashoffset on mount.
 */
export default function AIConfidenceRing({
  score,
  size = 56,
  strokeWidth = 4,
  className,
  showLabel = true,
  animate = true,
}: AIConfidenceRingProps): React.ReactElement {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;
  const { stroke, text, glow } = getColor(clampedScore);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* Glow filter */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-label={`AI confidence: ${clampedScore}%`}
      >
        <defs>
          <filter id={`ring-glow-${clampedScore}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(31,41,55,0.8)"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: animate ? offset : offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
        />
      </svg>

      {/* Center label */}
      {showLabel && (
        <motion.span
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className={cn('text-xs font-bold tabular-nums', text)}
        >
          {clampedScore}%
        </motion.span>
      )}
    </div>
  );
}
