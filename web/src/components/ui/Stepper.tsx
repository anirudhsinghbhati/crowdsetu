import React from 'react';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 50,
  label,
  className = '',
}) => {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <span className="text-sm font-medium text-muted">{label}</span>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-14 h-14 rounded-control bg-panel border border-border text-text text-2xl font-bold flex items-center justify-center hover:bg-border/60 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed select-none transition-transform"
          aria-label="Decrease group size"
        >
          −
        </button>
        <div className="flex-1 min-w-[80px] h-14 bg-bg border border-border rounded-control flex items-center justify-center">
          <span className="text-2xl font-bold text-text tabular-nums">{value}</span>
        </div>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-14 h-14 rounded-control bg-panel border border-border text-text text-2xl font-bold flex items-center justify-center hover:bg-border/60 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed select-none transition-transform"
          aria-label="Increase group size"
        >
          +
        </button>
      </div>
    </div>
  );
};
