import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles, UtensilsCrossed, Search, BarChart3, HeartPulse, LogOut, MessageCircle, ClipboardList, FlaskConical } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useLogout } from '@/features/auth/hooks/useAuthMutations';

export const DesktopSidebar: React.FC = () => {
  const { user } = useAuthStore();
  const handleLogoutRequest = useLogout();

  const navGroups = [
    { label: 'Nutrition', items: [
      { to: '/daily-tracker', label: 'Daily Nutrition', icon: <ClipboardList size={20} /> },
      { to: '/meals', label: 'Meals & Logs', icon: <UtensilsCrossed size={20} /> },
      { to: '/recipes', label: 'Recipes', icon: <UtensilsCrossed size={20} /> },
      { to: '/foods', label: 'Food Catalog', icon: <Search size={20} /> },
    ] },
    { label: 'Health', items: [
      { to: '/health', label: 'Health Profile', icon: <HeartPulse size={20} /> },
      { to: '/laboratory', label: 'Laboratory', icon: <FlaskConical size={20} /> },
      { to: '/trends', label: 'Nutrition Trends', icon: <BarChart3 size={20} /> },
    ] },
    { label: 'AI', items: [
      { to: '/consultation', label: 'Nutrition Consultation', icon: <MessageCircle size={20} /> },
    ] },
  ];

  const handleLogout = () => void handleLogoutRequest();

  return (
    <aside
      className="desktop-sidebar-only"
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1.5px solid var(--border-light)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-lg) var(--space-md)',
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        className="sidebar-brand-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 var(--space-sm) var(--space-xl)',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--text-inverse)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 3px 0 var(--color-primary-shadow)',
          }}
        >
          <Sparkles size={22} />
        </div>
        <div className="sidebar-brand-copy">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            NutriApp
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>
            Healthy Eating Made Simple
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', flex: 1, overflowY: 'auto' }} aria-label="Main navigation">
        <NavLink
          to="/"
          end
          className="sidebar-nav-item"
          title="Dashboard"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-full)',
            color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
            backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
            fontWeight: isActive ? 700 : 600,
            fontSize: '0.925rem',
            textDecoration: 'none',
            transition: 'all var(--transition-fast)',
          })}
        >
          <Sparkles size={20} />
          <span>Dashboard</span>
        </NavLink>

        {navGroups.map((group) => <div key={group.label} className="sidebar-nav-group">
          <p className="sidebar-group-label" style={{ padding: '0 var(--space-sm) 5px', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{group.label}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {group.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="sidebar-nav-item"
            title={item.label}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-full)',
              color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
              backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
              fontWeight: isActive ? 700 : 600,
              fontSize: '0.925rem',
              textDecoration: 'none',
              transition: 'all var(--transition-fast)',
            })}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
          ))}
          </div>
        </div>)}
      </nav>

      {/* User Footer */}
      <div
        className="sidebar-user-footer"
        style={{
          paddingTop: 'var(--space-md)',
          borderTop: '1.5px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div className="sidebar-user-details" style={{ overflow: 'hidden' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email || 'My Account'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Signed in
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Sign Out"
          className="sidebar-logout"
          style={{
            background: 'var(--bg-surface-secondary)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
