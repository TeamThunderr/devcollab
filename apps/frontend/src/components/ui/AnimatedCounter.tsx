import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * AnimatedCounter
 * Smoothly counts from 0 to `value` using easeOutExpo curve.
 * Triggers on mount and whenever `value` changes.
 */
export default function AnimatedCounter({
  value,
  duration = 900,
  className,
  suffix = '',
}: AnimatedCounterProps): React.ReactElement {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const start = performance.now();
    startRef.current = start;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const formatted =
    display >= 1000 ? `${(display / 1000).toFixed(1)}K` : String(display);

  return (
    <span className={className}>
      {formatted}{suffix}
    </span>
  );
}
