import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  padding = 'lg',
  className = '',
  style,
  ...props
}) => {
  const paddingStyles: Record<string, React.CSSProperties> = {
    none: { padding: 0 },
    sm: { padding: 'var(--space-sm)' },
    md: { padding: 'var(--space-md)' },
    lg: { padding: 'var(--space-lg)' },
  };

  return (
    <div
      className={`card ${interactive ? 'card-interactive' : ''} ${className}`}
      style={{
        ...paddingStyles[padding],
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
