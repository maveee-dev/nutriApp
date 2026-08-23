import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles, UtensilsCrossed, Search, BarChart3, HeartPulse, MessageCircle } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Today', icon: <Sparkles size={20} /> },
    { to: '/consultation', label: 'Ask', icon: <MessageCircle size={20} /> },
    { to: '/meals', label: 'Meals', icon: <UtensilsCrossed size={20} /> },
    { to: '/foods', label: 'Foods', icon: <Search size={20} /> },
    { to: '/trends', label: 'Trends', icon: <BarChart3 size={20} /> },
    { to: '/health', label: 'Health', icon: <HeartPulse size={20} /> },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(68px + env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1.5px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        padding: '0 var(--space-xs) env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 16px -2px rgba(15, 23, 42, 0.05)',
      }}
      className="mobile-nav-only"
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
            fontWeight: isActive ? 700 : 500,
            fontSize: '0.75rem',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
            transition: 'all var(--transition-fast)',
            minWidth: '56px',
          })}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
