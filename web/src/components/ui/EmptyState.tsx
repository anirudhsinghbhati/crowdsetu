import React from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/70 rounded-panel bg-panel/30 ${className}`}
  >
    {icon ? (
      <div className="text-muted/60 mb-3">{icon}</div>
    ) : (
      <div className="w-10 h-10 rounded-full bg-border/40 flex items-center justify-center text-muted mb-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </div>
    )}
    <h4 className="text-sm font-semibold text-text">{title}</h4>
    {description && (
      <p className="text-xs text-muted max-w-sm mt-1 leading-relaxed">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
