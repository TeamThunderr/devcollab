import { useEffect } from 'react';

/**
 * useCursorGlow
 * Tracks mouse position and sets CSS variables --cursor-x, --cursor-y
 * on document.documentElement. Components read these for cursor-follow effects.
 */
export function useCursorGlow() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);
}
