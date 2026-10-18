import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-border/40 rounded-control ${className}`}
    aria-hidden="true"
    {...props}
  />
);
