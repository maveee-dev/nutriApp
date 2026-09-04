import React from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, WandSparkles } from 'lucide-react';

/**
 * Secondary nutrition actions belong next to the user's current intake rather
 * than in the primary navigation. Keeping them here also gives Dashboard and
 * Daily Nutrition one consistent entry point for planning and recommendations.
 */
export const NutritionContextLinks: React.FC = () => (
  <nav
    aria-label="Nutrition planning shortcuts"
    style={{
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 'var(--space-xs)',
      marginBottom: 'var(--space-md)',
    }}
  >
    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 650 }}>
      Plan your next meal:
    </span>
    <Link
      to="/meal-planner"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 10px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-primary-subtle)',
        color: 'var(--color-primary)',
        fontSize: '0.78rem',
        fontWeight: 750,
        textDecoration: 'none',
      }}
    >
      <WandSparkles size={14} aria-hidden="true" />
      Meal Planner
    </Link>
    <Link
      to="/recommendations"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 10px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--bg-surface-secondary)',
        color: 'var(--text-secondary)',
        fontSize: '0.78rem',
        fontWeight: 750,
        textDecoration: 'none',
      }}
    >
      <Lightbulb size={14} aria-hidden="true" />
      Recommendations
    </Link>
  </nav>
);
