import React, { useEffect } from 'react';
import { IconClose } from './icons';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'lg',
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
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[width];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 flex pl-10">
        <div
          className={`w-screen ${widthClasses} bg-panel border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between p-5 border-b border-border/80">
            <div>
              <h2 className="text-base font-semibold text-text">{title}</h2>
              {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-text p-1.5 rounded-control transition-colors hover:bg-bg"
              aria-label="Close drawer"
            >
              <IconClose size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
};
