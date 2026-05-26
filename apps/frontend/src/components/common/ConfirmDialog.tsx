import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps): React.ReactElement | null {
  // Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = confirmVariant === 'danger';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog box */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className={cn(
          'relative z-10 w-full max-w-sm mx-4',
          'bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
        )}
      >
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center mb-4',
          isDanger ? 'bg-red-950/60' : 'bg-blue-950/60',
        )}>
          {isDanger
            ? <Trash2 className="w-5 h-5 text-red-400" />
            : <AlertTriangle className="w-5 h-5 text-amber-400" />
          }
        </div>

        {/* Title */}
        <h3
          id="confirm-dialog-title"
          className="text-base font-semibold text-white mb-2"
        >
          {title}
        </h3>

        {/* Message */}
        <p
          id="confirm-dialog-message"
          className="text-sm text-gray-400 mb-6 leading-relaxed"
        >
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50',
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700',
            )}
          >
            {isLoading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
