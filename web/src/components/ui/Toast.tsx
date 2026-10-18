import React, { createContext, useContext, useState, useCallback } from 'react';
import { IconCheck, IconAlertTriangle, IconAlertCircle, IconClose } from './icons';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const config = {
            success: {
              border: 'border-status-green/60',
              icon: <IconCheck size={16} className="text-status-green shrink-0" />,
            },
            warning: {
              border: 'border-status-yellow/60',
              icon: <IconAlertTriangle size={16} className="text-status-yellow shrink-0" />,
            },
            error: {
              border: 'border-status-red/60',
              icon: <IconAlertCircle size={16} className="text-status-red shrink-0" />,
            },
            info: {
              border: 'border-accent/60',
              icon: <span className="w-2 h-2 rounded-full bg-accent shrink-0" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto bg-panel border ${config.border} text-text text-sm rounded-control p-3.5 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2.5">
                {config.icon}
                <span className="text-xs font-medium">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-muted hover:text-text p-0.5 rounded transition-colors"
                aria-label="Dismiss notification"
              >
                <IconClose size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
