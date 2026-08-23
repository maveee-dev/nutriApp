import React from 'react';
import { useToastStore, type ToastType } from '@/store/useToastStore';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} color="var(--color-primary)" />;
      case 'warning':
        return <AlertTriangle size={20} color="var(--color-accent)" />;
      case 'error':
        return <AlertCircle size={20} color="var(--color-danger)" />;
      case 'info':
        return <Info size={20} color="var(--color-info)" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'var(--color-primary)';
      case 'warning':
        return 'var(--color-accent)';
      case 'error':
        return 'var(--color-danger)';
      case 'info':
        return 'var(--color-info)';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        left: '20px',
        maxWidth: '420px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 16px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            borderLeft: `5px solid ${getBorderColor(toast.type)}`,
            borderTop: '1px solid var(--border-light)',
            borderRight: '1px solid var(--border-light)',
            borderBottom: '1px solid var(--border-light)',
            animation: 'slideDown 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ flexShrink: 0, marginTop: '2px' }}>{getIcon(toast.type)}</div>
          <div style={{ flex: 1 }}>
            {toast.title && (
              <h4 style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '2px' }}>
                {toast.title}
              </h4>
            )}
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {toast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
