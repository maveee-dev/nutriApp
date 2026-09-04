import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  id,
  className = '',
  style,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const descriptionId = inputId ? `${inputId}-description` : undefined;

  return (
    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {leftIcon && (
          <span
            style={{
              position: 'absolute',
              left: '14px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          className={`input-field ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error || helperText ? descriptionId : undefined}
          style={{
            width: '100%',
            minHeight: 'var(--touch-target-min)',
            padding: `0 ${rightIcon ? '42px' : '16px'} 0 ${leftIcon ? '42px' : '16px'}`,
            borderRadius: 'var(--radius-md)',
            border: `2px solid ${error ? 'var(--color-danger)' : 'var(--border-light)'}`,
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            outline: 'none',
            transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
            ...style,
          }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onBlur={(e) => {
            if (!error) e.currentTarget.style.borderColor = 'var(--border-light)';
          }}
          {...props}
        />

        {rightIcon && (
          <span
            style={{
              position: 'absolute',
              right: '14px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
            }}
          >
            {rightIcon}
          </span>
        )}
      </div>

      {error ? (
        <span id={descriptionId} className="form-error" role="alert">
          {error}
        </span>
      ) : helperText ? (
        <span id={descriptionId} className="form-helper">
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
