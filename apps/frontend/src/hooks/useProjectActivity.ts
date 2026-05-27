/**
 * apps/frontend/src/hooks/useProjectActivity.ts
 *
 * Subscribes to the `activity:new` Socket.IO event for a project room.
 * When a new activity arrives it is prepended to the project activity store.
 * 
 * Prerequisites: the project room must already be joined by useTaskSync.
 */

import { useEffect, useRef } from 'react';
import { socket } from '../lib/socket';
import { Activity } from '../types';

interface UseProjectActivityOptions {
  /** Called with each incoming activity event */
  onActivity: (activity: Activity) => void;
}

export function useProjectActivity({ onActivity }: UseProjectActivityOptions): void {
  // Keep a stable ref so we never stale-close over an old callback
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  useEffect(() => {
    const handler = (data: unknown) => {
      onActivityRef.current(data as Activity);
    };

    socket.on('activity:new', handler);

    return () => {
      socket.off('activity:new', handler);
    };
  }, []);
}
