import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  id,
  className = '',
  style,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="select-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label
          htmlFor={selectId}
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
        <select
          id={selectId}
          className={`select-field ${className}`}
          style={{
            width: '100%',
            minHeight: 'var(--touch-target-min)',
            padding: '0 40px 0 16px',
            borderRadius: 'var(--radius-md)',
            border: `2px solid ${error ? 'var(--color-danger)' : 'var(--border-light)'}`,
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            outline: 'none',
            appearance: 'none',
            cursor: 'pointer',
            ...style,
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span
          style={{
            position: 'absolute',
            right: '14px',
            pointerEvents: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronDown size={18} />
        </span>
      </div>

      {error ? (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-danger)', fontWeight: 500 }}>
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
