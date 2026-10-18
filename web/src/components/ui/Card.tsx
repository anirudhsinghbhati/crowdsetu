import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  highlightRed?: boolean;
  highlightYellow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  highlightRed = false,
  highlightYellow = false,
  className = '',
  ...props
}) => {
  let borderClasses = 'border-border';
  if (highlightRed) {
    borderClasses = 'border-status-red/80 shadow-[0_0_12px_rgba(217,60,60,0.15)]';
  } else if (highlightYellow) {
    borderClasses = 'border-status-yellow/70 shadow-[0_0_12px_rgba(229,185,31,0.1)]';
  }

  return (
    <div
      className={`bg-panel border rounded-panel transition-all duration-200 ${borderClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 border-b border-border/60 flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-sm font-semibold text-text tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs text-muted mt-0.5 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 pt-0 border-t border-border/40 mt-3 flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);
