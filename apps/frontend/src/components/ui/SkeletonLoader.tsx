import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

function SkeletonBase({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton-shimmer rounded-lg', className)}
      aria-hidden="true"
    />
  );
}

function SkeletonLine({ width = 'w-full', className }: { width?: string; className?: string }) {
  return <SkeletonBase className={cn('h-3', width, className)} />;
}

function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-2xl bg-[#111827] border border-[#1F2937] p-5 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <SkeletonBase className="w-9 h-9 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-2/3" />
          <SkeletonLine width="w-1/2" />
        </div>
      </div>
      <SkeletonLine />
      <SkeletonLine width="w-4/5" />
      <SkeletonLine width="w-3/5" />
    </div>
  );
}

function SkeletonAvatar({ size = 'w-8 h-8' }: { size?: string }) {
  return <SkeletonBase className={cn('rounded-full flex-shrink-0', size)} />;
}

function SkeletonStatCard() {
  return (
    <div className="rounded-2xl bg-[#111827] border border-[#1F2937] p-5 flex items-center gap-4">
      <SkeletonBase className="w-11 h-11 rounded-xl flex-shrink-0" />
      <div className="space-y-2 flex-1">
        <SkeletonBase className="h-7 w-16 rounded-lg" />
        <SkeletonLine width="w-24" />
      </div>
    </div>
  );
}

/** Shimmer skeleton system with typed sub-components */
const SkeletonLoader = Object.assign(SkeletonBase, {
  Line: SkeletonLine,
  Card: SkeletonCard,
  Avatar: SkeletonAvatar,
  StatCard: SkeletonStatCard,
});

export default SkeletonLoader;
