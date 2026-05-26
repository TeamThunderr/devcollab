import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  className?: string;
  children: React.ReactNode;
  /** If true, clicking the overlay closes the modal (default: true) */
  closeOnOverlay?: boolean;
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const SIZES: Record<ModalSize, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  full: 'max-w-5xl',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  className,
  children,
  closeOnOverlay = true,
}: ModalProps): React.ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // ── Focus management ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the dialog on next tick
      const t = setTimeout(() => {
        dialogRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ── Body scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full bg-gray-900 border border-gray-700/60',
          'rounded-2xl shadow-2xl outline-none',
          'animate-in fade-in zoom-in-95 duration-200',
          SIZES[size],
          className,
        )}
      >
        {/* Header (only if title provided) */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="text-gray-500 hover:text-white transition-colors rounded-lg p-1 hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
