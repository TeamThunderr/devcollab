import React from 'react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'button' | 'circle';
}

// ─── Base skeleton ────────────────────────────────────────────────────────────

export default function Skeleton({
  className,
  variant = 'text',
}: SkeletonProps): React.ReactElement {
  const base = 'animate-pulse bg-gray-800 rounded';

  const variants = {
    text:   'h-4 rounded w-full',
    card:   'h-24 rounded-xl w-full',
    avatar: 'rounded-full w-8 h-8',
    button: 'h-9 rounded-lg w-24',
    circle: 'rounded-full',
  };

  return <div className={cn(base, variants[variant], className)} />;
}

// ─── Composed skeleton rows ───────────────────────────────────────────────────

/** Renders N lines of text skeletons with varying widths — good for list items */
export function SkeletonText({ lines = 3 }: { lines?: number }): React.ReactElement {
  const widths = ['w-full', 'w-4/5', 'w-3/5', 'w-full', 'w-2/3', 'w-5/6'];
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" className={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/** Task card skeleton — matches the KanbanColumn card layout */
export function SkeletonTaskCard(): React.ReactElement {
  return (
    <div className="w-full rounded-lg border border-white/[0.04] bg-[#1e2025] p-3 space-y-2.5 animate-pulse">
      {/* Title row */}
      <div className="flex justify-between gap-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton variant="avatar" className="w-4 h-4 flex-shrink-0" />
      </div>
      {/* Description */}
      <Skeleton className="h-2.5 w-1/2" />
      {/* Badges row */}
      <div className="flex gap-1.5">
        <Skeleton className="h-4 w-10 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
    </div>
  );
}

/** Member row skeleton */
export function SkeletonMemberRow(): React.ReactElement {
  return (
    <div className="flex items-center gap-3 py-3 px-4 animate-pulse">
      <Skeleton variant="avatar" className="w-8 h-8 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2.5 w-44" />
      </div>
      <Skeleton className="h-6 w-16 rounded-md" />
    </div>
  );
}

/** Wiki page list skeleton */
export function SkeletonWikiItem(): React.ReactElement {
  return (
    <div className="flex items-center gap-2 px-3 py-2 animate-pulse">
      <Skeleton className="w-3.5 h-3.5 rounded flex-shrink-0" />
      <Skeleton className="h-3 flex-1" />
    </div>
  );
}
