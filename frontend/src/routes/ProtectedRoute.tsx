import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { authApi } from '@/features/auth/api/authApi';

export const ProtectedRoute: React.FC = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const location = useLocation();
  const [isRestoring, setIsRestoring] = useState(!accessToken);

  useEffect(() => {
    if (accessToken) {
      setIsRestoring(false);
      return undefined;
    }

    let active = true;
    setIsRestoring(true);
    authApi.refresh()
      .then((response) => {
        if (active) setAuth(response.accessToken, response.user);
      })
      .catch(() => {
        // A missing or revoked HttpOnly cookie is handled by the redirect below.
      })
      .finally(() => {
        if (active) setIsRestoring(false);
      });

    return () => { active = false; };
  }, [accessToken, setAuth]);

  if (isRestoring) {
    return <div role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>Restoring your session…</div>;
  }

  if (!accessToken) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
};
