import React from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useLogout } from '@/features/auth/hooks/useAuthMutations';
import { LogOut, Sparkles } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const handleLogout = useLogout();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Desktop Sidebar (visible on >= 1024px) */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile Header */}
        <header
          className="mobile-header-only"
          style={{
            height: '60px',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1.5px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-md)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--text-inverse)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              NutriApp
            </span>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Sign Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              cursor: 'pointer',
            }}
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Dynamic Page Content */}
        <main
          className="page-container"
          style={{
            flex: 1,
            padding: 'var(--space-lg) var(--space-md)',
            paddingBottom: 'calc(var(--space-lg) + env(safe-area-inset-bottom))',
            maxWidth: '1080px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Sticky Bottom Nav */}
      <MobileBottomNav />

      {/* Responsive layout CSS rules */}
      <style>{`
        @media (max-width: 1023px) {
          .desktop-sidebar-only {
            display: none !important;
          }
          .page-container {
            padding-bottom: calc(96px + env(safe-area-inset-bottom)) !important;
          }
        }
        @media (min-width: 1024px) {
          .mobile-nav-only {
            display: none !important;
          }
          .mobile-header-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
