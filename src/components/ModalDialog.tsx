import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { soundFx } from '../lib/soundFx.ts';

interface ModalDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidthClass?: string;
  accentBorderClass?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  open,
  title,
  subtitle,
  icon,
  maxWidthClass = 'max-w-md',
  accentBorderClass = 'border-slate-700',
  onClose,
  children,
}) => {
  const prevOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      soundFx.playModalOpen();
    }
    prevOpenRef.current = open;

    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundFx.playModalClose();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    soundFx.playModalClose();
    onCloseRef.current();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${maxWidthClass} rounded-2xl border ${accentBorderClass} bg-[#131B2E] shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-800 bg-[#0F1627] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-bold text-white truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close pop-up"
            className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-700 bg-[#0B101B] text-slate-300 hover:text-white hover:border-amber-400 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
