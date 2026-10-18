import React, { useState } from 'react';
import { IconEye, IconEyeOff } from './icons';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-muted mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-muted pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-bg border ${
              error ? 'border-status-red focus:border-status-red' : 'border-border focus:border-accent'
            } text-text rounded-control text-sm px-3 py-2 transition-colors placeholder:text-muted/60 focus:outline-none focus:ring-1 ${
              error ? 'focus:ring-status-red' : 'focus:ring-accent'
            } disabled:opacity-50 disabled:cursor-not-allowed ${leftIcon ? 'pl-9' : ''} ${
              rightIcon ? 'pr-9' : ''
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-muted flex items-center">{rightIcon}</div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-status-red flex items-center gap-1" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <Input
        {...props}
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="text-muted hover:text-text focus:outline-none transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          </button>
        }
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
