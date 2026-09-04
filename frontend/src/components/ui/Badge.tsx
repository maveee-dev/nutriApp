import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'clinical' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
  style,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; color: string; border?: string }> = {
    success: { bg: 'var(--color-primary-light)', color: 'var(--color-primary-shadow)' },
    warning: { bg: 'var(--color-accent-light)', color: 'var(--color-accent-shadow)' },
    danger: { bg: 'var(--color-danger-light)', color: 'var(--color-danger-shadow)' },
    info: { bg: 'var(--color-info-light)', color: 'var(--color-info-hover)' },
    clinical: { bg: 'var(--color-clinical-light)', color: 'var(--color-clinical-hover)' },
    neutral: { bg: 'var(--bg-surface-secondary)', color: 'var(--text-secondary)' },
  };

  const { bg, color } = variantStyles[variant];

  return (
    <span
      className={`badge badge-${variant} ${className}`}
      data-variant={variant}
      data-size={size}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '3px 8px' : '5px 12px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: bg,
        color: color,
        fontSize: size === 'sm' ? '0.75rem' : '0.8125rem',
        fontWeight: 700,
        letterSpacing: '0.01em',
        lineHeight: 1.2,
        ...style,
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
};
