import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, ClipboardList, HeartPulse, Plus, Search, Sparkles, UtensilsCrossed } from 'lucide-react';

interface MobileNavLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

const linkStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '3px',
  color: active ? 'var(--color-primary)' : 'var(--text-muted)',
  fontWeight: active ? 750 : 600,
  fontSize: '0.7rem',
  textDecoration: 'none',
  padding: '6px 4px',
  borderRadius: 'var(--radius-md)',
  backgroundColor: active ? 'var(--color-primary-subtle)' : 'transparent',
  transition: 'all var(--transition-fast)',
  minWidth: 0,
  minHeight: '48px',
});

const MobileNavLink: React.FC<MobileNavLinkProps> = ({ to, label, icon, active }) => (
  <Link to={to} aria-current={active ? 'page' : undefined} style={linkStyle(active)}>
    {icon}
    <span>{label}</span>
  </Link>
);

const actionItems = [
  { to: '/daily-tracker', label: 'Add Food', description: 'Search the food catalog or your recipes.', icon: <Search size={20} /> },
  { to: '/food-recognition', label: 'Scan Food', description: 'Take a photo and review the detected foods.', icon: <Camera size={20} /> },
  { to: '/recipes', label: 'Create Recipe', description: 'Build a recipe from foods you trust.', icon: <UtensilsCrossed size={20} /> },
  { to: '/meals', label: 'Log Meal', description: 'Record several foods as one meal.', icon: <ClipboardList size={20} /> },
];

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const isNutritionActive = ['/daily-tracker', '/meals', '/foods', '/recipes'].some((path) => location.pathname.startsWith(path));
  const isHealthActive = ['/health', '/laboratory', '/trends', '/nutrition-targets'].some((path) => location.pathname.startsWith(path));

  useEffect(() => {
    if (!isActionSheetOpen) return undefined;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      sheetRef.current?.querySelector<HTMLElement>('[data-action-sheet-close]')?.focus();
    });
    const previousBodyOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsActionSheetOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isActionSheetOpen]);

  const closeActionSheet = () => setIsActionSheetOpen(false);

  return (
    <>
      {isActionSheetOpen && (
        <div
          className="mobile-action-sheet-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeActionSheet();
          }}
        >
          <section ref={sheetRef} className="mobile-action-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-action-sheet-title">
            <div className="mobile-action-sheet-header">
              <div>
                <p className="mobile-action-sheet-eyebrow">Add to your nutrition diary</p>
                <h2 id="mobile-action-sheet-title">What would you like to log?</h2>
              </div>
              <button type="button" data-action-sheet-close aria-label="Close log actions" onClick={closeActionSheet} className="mobile-action-sheet-close">
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="mobile-action-sheet-options">
              {actionItems.map((item) => (
                <Link key={item.to} to={item.to} onClick={closeActionSheet} className="mobile-action-sheet-option">
                  <span className="mobile-action-sheet-icon" aria-hidden="true">{item.icon}</span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      <nav className="mobile-nav-only mobile-bottom-nav" aria-label="Primary navigation">
        <div className="mobile-bottom-nav-inner">
          <MobileNavLink to="/" label="Dashboard" icon={<Sparkles size={19} />} active={location.pathname === '/'} />
          <MobileNavLink to="/daily-tracker" label="Nutrition" icon={<ClipboardList size={19} />} active={isNutritionActive} />
          <span className="mobile-fab-slot" aria-hidden="true" />
          <MobileNavLink to="/health" label="Health" icon={<HeartPulse size={19} />} active={isHealthActive} />
          <MobileNavLink to="/consultation" label="AI" icon={<Sparkles size={19} />} active={location.pathname.startsWith('/consultation')} />
        </div>
        <button
          ref={triggerRef}
          type="button"
          className="mobile-log-fab"
          aria-label="Log food, scan food, create a recipe, or log a meal"
          aria-expanded={isActionSheetOpen}
          onClick={() => setIsActionSheetOpen((open) => !open)}
        >
          <Plus size={24} aria-hidden="true" />
          <span>Log</span>
        </button>
      </nav>
    </>
  );
};
