import React from 'react';

export interface ProgressBarProps {
  value: number; // Current value
  max: number; // Target limit or goal
  label?: string;
  unit?: string;
  showPercentage?: boolean;
  variant?: 'primary' | 'accent' | 'dynamic';
  meaning?: 'upper-limit' | 'adequacy-target';
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  unit = '',
  showPercentage = false,
  variant = 'dynamic',
  meaning = 'upper-limit',
  size = 'md',
}) => {
  const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const isOver = meaning === 'upper-limit' && max > 0 && value > max;

  // Determine dynamic bar color based on target limit
  let barColor = 'var(--color-primary)';
  if (variant === 'accent') {
    barColor = 'var(--color-accent)';
  } else if (variant === 'dynamic') {
    if (isOver) {
      barColor = 'var(--color-danger)';
    } else if (percentage >= 85) {
      barColor = 'var(--color-accent)';
    } else {
      barColor = 'var(--color-primary)';
    }
  }

  const heightStyles = {
    sm: '8px',
    md: '12px',
    lg: '18px',
  }[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {(label || max > 0) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: '0.875rem',
          }}
        >
          {label && (
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {label}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: isOver ? 'var(--color-danger)' : 'var(--text-primary)' }}>
              {value} {unit}
            </span>
            {max > 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                / {max} {unit}
              </span>
            )}
            {showPercentage && max > 0 && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                ({percentage}%)
              </span>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          width: '100%',
          height: heightStyles,
          backgroundColor: 'var(--bg-surface-secondary)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 'var(--radius-full)',
            transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1), background-color 300ms ease',
          }}
        />
      </div>
    </div>
  );
};
