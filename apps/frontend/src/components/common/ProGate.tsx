/**
 * apps/frontend/src/components/common/ProGate.tsx
 *
 * Wraps a feature behind a Pro plan gate.
 * isPro defaults to true for now (all features unlocked during dev).
 */

import React from "react";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProGateProps {
  children: React.ReactNode;
  feature: string;
  /** Default true — all features unlocked during development */
  isPro?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProGate({
  children,
  feature,
  isPro = true,
}: ProGateProps): React.ReactElement {
  const navigate = useNavigate();

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Dimmed, non-interactive children */}
      <div className="relative pointer-events-none select-none opacity-40">
        {children}
      </div>

      {/* Lock overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center
                   backdrop-blur-sm bg-white/50 dark:bg-gray-900/50
                   rounded-xl z-10"
      >
        <span className="text-2xl" aria-hidden="true">
          🔒
        </span>
        <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
          Pro Feature
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{feature}</p>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700
                     text-white text-xs rounded-lg
                     transition-colors duration-150"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
