import React from 'react';
import { IconCheck, IconAlertTriangle, IconAlertCircle } from './icons';

export type StatusLevel = 'green' | 'yellow' | 'red' | 'grey';

export interface ChipProps {
  level: StatusLevel;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

const defaultLabels: Record<StatusLevel, string> = {
  green: 'Normal',
  yellow: 'Moderate',
  red: 'Critical',
  grey: 'Offline',
};

export const Chip: React.FC<ChipProps> = ({
  level,
  label,
  size = 'md',
  className = '',
  showIcon = true,
}) => {
  const displayLabel = label || defaultLabels[level];

  const config = {
    green: {
      bg: 'bg-[#2FA866]/15',
      border: 'border-[#2FA866]/30',
      text: 'text-[#2FA866]',
      icon: <IconCheck size={size === 'sm' ? 12 : 14} className="shrink-0" />,
    },
    yellow: {
      bg: 'bg-[#E5B91F]/15',
      border: 'border-[#E5B91F]/30',
      text: 'text-[#E5B91F]',
      icon: <IconAlertTriangle size={size === 'sm' ? 12 : 14} className="shrink-0" />,
    },
    red: {
      bg: 'bg-[#D93C3C]/15',
      border: 'border-[#D93C3C]/30',
      text: 'text-[#D93C3C]',
      icon: <IconAlertCircle size={size === 'sm' ? 12 : 14} className="shrink-0" />,
    },
    grey: {
      bg: 'bg-[#7A8190]/15',
      border: 'border-[#7A8190]/30',
      text: 'text-[#7A8190]',
      icon: (
        <span
          className={`inline-block rounded-full bg-[#7A8190] shrink-0 ${
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
          }`}
        />
      ),
    },
  }[level];

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-control border ${config.bg} ${config.border} ${config.text} ${sizeClasses} select-none ${className}`}
    >
      {showIcon && config.icon}
      <span>{displayLabel}</span>
    </span>
  );
};
