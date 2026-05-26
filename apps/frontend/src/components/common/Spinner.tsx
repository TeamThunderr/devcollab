import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const SIZES: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Spinner({
  size = 'md',
  className,
}: SpinnerProps): React.ReactElement {
  return (
    <Loader2
      className={cn(SIZES[size], 'animate-spin text-blue-400', className)}
      aria-label="Loading"
    />
  );
}

// ─── Full-screen overlay variant ─────────────────────────────────────────────

export function FullPageSpinner(): React.ReactElement {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
