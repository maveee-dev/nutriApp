import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import type { LoginResponse } from '../types/auth.types';
import { GoogleIcon } from './GoogleIcon';

export const GoogleSignInButton: React.FC = () => {
  const [googleError, setGoogleError] = useState('');
  const popupRef = useRef<Window | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    const handleGoogleMessage = (event: MessageEvent) => {
      if (popupRef.current && event.source !== popupRef.current) return;

      const expectedOrigin = import.meta.env.VITE_AUTH_ORIGIN as string | undefined;
      if (expectedOrigin && event.origin !== expectedOrigin) return;

      const message = event.data as (Partial<LoginResponse> & { type?: string }) | undefined;
      if (message?.type !== 'nutriapp:google-auth' || !message.accessToken || !message.user) return;

      setAuth(message.accessToken, message.user);
      popupRef.current?.close();
      const requestedDestination = new URLSearchParams(window.location.search).get('next');
      const destination = requestedDestination && requestedDestination.startsWith('/') && !requestedDestination.startsWith('//')
        ? requestedDestination
        : '/';
      navigate(destination);
    };

    window.addEventListener('message', handleGoogleMessage);
    return () => window.removeEventListener('message', handleGoogleMessage);
  }, [navigate, setAuth]);

  const handleGoogleSignIn = () => {
    setGoogleError('');
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const popup = window.open(`${apiBase}/auth/google`, 'nutriapp-google-sign-in', 'popup,width=500,height=700');

    if (!popup) {
      setGoogleError('Please allow pop-ups to continue with Google.');
      return;
    }

    popupRef.current = popup;
  };

  return (
    <>
      {googleError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            backgroundColor: 'var(--color-danger-subtle)',
            border: '1.5px solid var(--color-danger-light)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 }}>{googleError}</div>
        </div>
      )}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        leftIcon={<GoogleIcon size={20} />}
        onClick={handleGoogleSignIn}
        style={{ width: '100%' }}
      >
        Continue with Google
      </Button>
    </>
  );
};
