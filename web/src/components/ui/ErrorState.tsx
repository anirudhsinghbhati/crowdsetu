import React from 'react';
import { Button } from './Button';
import { IconAlertTriangle, IconRefresh } from './icons';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Unable to fetch the latest data. Please check your network connection and try again.',
  onRetry,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center p-8 text-center border border-status-red/30 rounded-panel bg-status-red/5 ${className}`}
    role="alert"
  >
    <div className="w-10 h-10 rounded-full bg-status-red/10 border border-status-red/30 flex items-center justify-center text-status-red mb-3">
      <IconAlertTriangle size={20} />
    </div>
    <h4 className="text-sm font-semibold text-text">{title}</h4>
    <p className="text-xs text-muted max-w-sm mt-1 leading-relaxed">{message}</p>
    {onRetry && (
      <div className="mt-4">
        <Button variant="secondary" size="sm" onClick={onRetry} icon={<IconRefresh size={14} />}>
          Retry
        </Button>
      </div>
    )}
  </div>
);
