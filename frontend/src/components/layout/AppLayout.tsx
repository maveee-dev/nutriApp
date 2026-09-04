import React from 'react';
import { Outlet } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useLogout } from '@/features/auth/hooks/useAuthMutations';
import { LogOut, Sparkles } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const handleLogout = useLogout();

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Desktop/tablet sidebar (collapsed on tablet, hidden on mobile) */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <div className="app-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile Header */}
        <header
          className="mobile-header-only mobile-header"
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
            maxWidth: 'var(--content-max-width)',
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
        .mobile-bottom-nav {
          display: none;
        }

        @media (min-width: 768px) and (max-width: 1199px) {
          .desktop-sidebar-only {
            width: 76px !important;
            padding: var(--space-lg) var(--space-xs) !important;
            box-sizing: border-box;
          }
          .sidebar-brand-header {
            justify-content: center;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .sidebar-brand-copy,
          .sidebar-group-label,
          .sidebar-nav-item > span,
          .sidebar-user-details {
            display: none !important;
          }
          .sidebar-nav-item {
            justify-content: center;
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
          .sidebar-user-footer {
            justify-content: center !important;
          }
        }

        @media (max-width: 767px) {
          .desktop-sidebar-only {
            display: none !important;
          }
          .mobile-bottom-nav {
            display: flex !important;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            height: calc(76px + env(safe-area-inset-bottom));
            box-sizing: border-box;
            align-items: center;
            background: var(--bg-surface);
            border-top: 1.5px solid var(--border-light);
            box-shadow: 0 -4px 16px -2px rgba(15, 23, 42, 0.08);
            padding: 0 var(--space-xs) env(safe-area-inset-bottom);
            z-index: var(--z-bottom-nav);
          }
          .mobile-bottom-nav-inner {
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            align-items: center;
            gap: 2px;
          }
          .mobile-bottom-nav-inner > a {
            width: 100%;
          }
          .mobile-fab-slot {
            display: block;
            min-height: 48px;
          }
          .mobile-log-fab {
            position: absolute;
            left: 50%;
            bottom: calc(34px + env(safe-area-inset-bottom));
            transform: translateX(-50%);
            width: 62px;
            height: 62px;
            border: 4px solid var(--bg-surface);
            border-radius: var(--radius-full);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0;
            background: var(--color-primary);
            color: var(--text-inverse);
            box-shadow: 0 4px 0 var(--color-primary-shadow), 0 8px 18px rgba(15, 23, 42, 0.16);
            font: inherit;
            font-size: 0.67rem;
            font-weight: 800;
            cursor: pointer;
            z-index: 2;
          }
          .mobile-log-fab:active {
            transform: translate(-50%, 2px);
          }
          .mobile-action-sheet-backdrop {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding: var(--space-md);
            background: rgba(15, 23, 42, 0.42);
            z-index: var(--z-sheet);
          }
          .mobile-action-sheet {
            width: min(520px, 100%);
            max-height: min(80vh, 620px);
            overflow-y: auto;
            padding: var(--space-lg);
            background: var(--bg-surface);
            border: 1.5px solid var(--border-light);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-modal);
            animation: mobile-sheet-up 180ms ease-out;
          }
          .mobile-action-sheet-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: var(--space-md);
            margin-bottom: var(--space-md);
          }
          .mobile-action-sheet-eyebrow {
            color: var(--color-primary);
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }
          .mobile-action-sheet h2 {
            margin-top: 4px;
            font-size: 1.25rem;
            font-weight: 800;
          }
          .mobile-action-sheet-close {
            width: 40px;
            height: 40px;
            flex: 0 0 auto;
            border: 0;
            border-radius: var(--radius-full);
            background: var(--bg-surface-secondary);
            color: var(--text-secondary);
            font-size: 1.6rem;
            line-height: 1;
            cursor: pointer;
          }
          .mobile-action-sheet-options {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: var(--space-xs);
          }
          .mobile-action-sheet-option {
            display: flex;
            align-items: flex-start;
            gap: var(--space-sm);
            min-height: 84px;
            padding: var(--space-sm);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-md);
            background: var(--bg-surface-secondary);
            color: var(--text-primary);
            text-decoration: none;
          }
          .mobile-action-sheet-option:hover {
            border-color: var(--color-primary);
            text-decoration: none;
          }
          .mobile-action-sheet-option strong,
          .mobile-action-sheet-option small {
            display: block;
          }
          .mobile-action-sheet-option strong {
            font-size: 0.86rem;
          }
          .mobile-action-sheet-option small {
            margin-top: 4px;
            color: var(--text-secondary);
            font-size: 0.73rem;
            line-height: 1.35;
          }
          .mobile-action-sheet-icon {
            display: grid;
            place-items: center;
            width: 36px;
            height: 36px;
            flex: 0 0 auto;
            border-radius: var(--radius-sm);
            background: var(--color-primary-light);
            color: var(--color-primary-shadow);
          }
          @keyframes mobile-sheet-up {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (max-width: 380px) {
            .mobile-action-sheet-options {
              grid-template-columns: 1fr;
            }
            .mobile-bottom-nav-inner > a {
              font-size: 0.65rem !important;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .mobile-action-sheet {
              animation: none;
            }
          }
          .page-container {
            padding-bottom: calc(96px + env(safe-area-inset-bottom)) !important;
          }
        }
        @media (min-width: 768px) {
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
