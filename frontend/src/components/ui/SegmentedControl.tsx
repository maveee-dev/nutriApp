import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  fullWidth?: boolean;
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  fullWidth = true,
}: SegmentedControlProps<T>) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        backgroundColor: 'var(--bg-surface-secondary)',
        padding: '4px',
        borderRadius: 'var(--radius-full)',
        border: '1.5px solid var(--border-light)',
        width: fullWidth ? '100%' : 'fit-content',
        gap: '4px',
      }}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: fullWidth ? 1 : 'initial',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              minHeight: '38px',
              padding: '0 14px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              backgroundColor: isSelected ? 'var(--bg-surface)' : 'transparent',
              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: isSelected ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
              transition: 'background-color var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast)',
            }}
          >
            {opt.icon && <span>{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
