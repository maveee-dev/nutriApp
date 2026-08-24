import React from 'react';
import { Sparkles } from 'lucide-react';

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthShell: React.FC<AuthShellProps> = ({ title, description, children, footer }) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-lg) var(--space-md)', backgroundColor: 'var(--bg-app)' }}>
    <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-primary)', color: 'var(--text-inverse)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 0 var(--color-primary-shadow)', marginBottom: 'var(--space-md)' }}><Sparkles size={30} /></div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{title}</h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'center' }}>{description}</p>
      </div>
      {children}
      {footer && <div style={{ textAlign: 'center' }}>{footer}</div>}
    </div>
  </div>
);
