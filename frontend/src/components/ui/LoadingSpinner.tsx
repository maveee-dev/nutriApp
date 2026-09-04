import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  label?: string;
  size?: number;
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading your nutrition data...',
  size = 32,
  fullPage = false,
}) => {
  const content = (
    <div
      className="loading-state"
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-xl)',
        textAlign: 'center',
      }}
    >
      <Loader2
        size={size}
        style={{
          color: 'var(--color-primary)',
          animation: 'spin 1s linear infinite',
        }}
      />
      {label && (
        <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {label}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};
