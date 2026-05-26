import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import useToastStore, { Toast, ToastType } from '../../stores/toastStore';
import { cn } from '../../lib/utils';

// ─── Config ───────────────────────────────────────────────────────────────────

const TOAST_STYLES: Record<ToastType, {
  border: string;
  bg: string;
  icon: React.FC<{ className?: string }>;
  iconColor: string;
  bar: string;
}> = {
  success: {
    border: 'border-green-800',
    bg: 'bg-green-950/60',
    icon: CheckCircle,
    iconColor: 'text-green-400',
    bar: 'bg-green-500',
  },
  error: {
    border: 'border-red-800',
    bg: 'bg-red-950/60',
    icon: XCircle,
    iconColor: 'text-red-400',
    bar: 'bg-red-500',
  },
  warning: {
    border: 'border-amber-800',
    bg: 'bg-amber-950/60',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    bar: 'bg-amber-500',
  },
  info: {
    border: 'border-blue-800',
    bg: 'bg-blue-950/60',
    icon: Info,
    iconColor: 'text-blue-400',
    bar: 'bg-blue-500',
  },
};

// ─── Single Toast Item ─────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps): React.ReactElement {
  const style = TOAST_STYLES[toast.type];
  const IconComponent = style.icon;
  const duration = toast.duration ?? 4000;

  // Animate in
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Trigger slide-in on mount
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleRemove = () => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'pointer-events-auto relative flex items-start gap-3 rounded-xl border shadow-2xl',
        'px-4 py-3 min-w-72 max-w-96 overflow-hidden',
        'transition-all duration-200 ease-out',
        style.border,
        style.bg,
        // Slide-in from right
        visible && !leaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0',
      )}
    >
      {/* Icon */}
      <IconComponent className={cn('w-5 h-5 flex-shrink-0 mt-0.5', style.iconColor)} />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{toast.message}</p>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleRemove}
        aria-label="Dismiss notification"
        className="flex-shrink-0 text-gray-500 hover:text-white transition-colors ml-1 -mr-1 -mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <div
          className={cn('absolute bottom-0 left-0 h-0.5 rounded-b-xl', style.bar)}
          style={{
            animation: `toast-progress ${duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}

// ─── Toast Container ──────────────────────────────────────────────────────────

export function ToastContainer(): React.ReactElement {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return createPortal(
    <>
      {/* Inject progress bar keyframe once */}
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div
        aria-label="Notifications"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </>,
    document.body,
  );
}

export default ToastContainer;
