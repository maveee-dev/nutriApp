import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant];

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { minHeight: '38px', padding: '0 14px', fontSize: '0.875rem' },
    md: { minHeight: '48px', padding: '0 20px', fontSize: '0.95rem' },
    lg: { minHeight: '54px', padding: '0 28px', fontSize: '1.05rem' },
  };

  return (
    <button
      className={`btn ${variantClass} btn-size-${size} ${className}`}
      data-variant={variant}
      data-size={size}
      aria-busy={isLoading || undefined}
      style={sizeStyles[size]}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={18} />
      ) : (
        <>
          {leftIcon && <span className="btn-icon">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="btn-icon">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
