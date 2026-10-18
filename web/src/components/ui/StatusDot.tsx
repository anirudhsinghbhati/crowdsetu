import React from 'react';
import type { StatusLevel } from './Chip';

export interface StatusDotProps {
  level: StatusLevel;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  level,
  pulse = false,
  size = 'md',
  label,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  }[size];

  const colorClasses = {
    green: 'bg-[#2FA866]',
    yellow: 'bg-[#E5B91F]',
    red: 'bg-[#D93C3C]',
    grey: 'bg-[#7A8190]',
  }[level];

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex items-center justify-center">
        {pulse && level !== 'grey' && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${colorClasses}`}
          />
        )}
        <span
          className={`relative inline-block rounded-full ${sizeClasses} ${colorClasses}`}
          aria-hidden="true"
        />
      </span>
      {label && <span className="text-xs text-text select-none">{label}</span>}
    </span>
  );
};
