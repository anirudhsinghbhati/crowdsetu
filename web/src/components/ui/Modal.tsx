import React, { useEffect } from 'react';
import { Button } from './Button';
import { IconClose } from './icons';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full ${widthClasses} bg-panel border border-border rounded-panel shadow-2xl overflow-hidden transition-all duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border/80">
          <div>
            <h3 id="modal-title" className="text-base font-semibold text-text">
              {title}
            </h3>
            {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text p-1 rounded-control transition-colors"
            aria-label="Close dialog"
          >
            <IconClose size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  loading = false,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
    <p className="text-sm text-text/90 mb-6 leading-relaxed">{message}</p>
    <div className="flex items-center justify-end gap-3">
      <Button variant="secondary" onClick={onClose} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        variant={isDanger ? 'danger' : 'primary'}
        onClick={onConfirm}
        loading={loading}
      >
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);
