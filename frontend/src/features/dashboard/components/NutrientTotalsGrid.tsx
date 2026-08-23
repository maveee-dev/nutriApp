import React from 'react';
import { Card } from '@/components/ui/Card';
import { Flame } from 'lucide-react';
import type { NutritionTotal } from '../types/dashboard.types';

export interface NutrientTotalsGridProps {
  totals: NutritionTotal[];
}

export const NutrientTotalsGrid: React.FC<NutrientTotalsGridProps> = ({ totals }) => {
  if (!totals || totals.length === 0) {
    return null;
  }

  return (
    <Card style={{ border: '1.5px solid var(--border-light)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: 'var(--space-md)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-accent-light)',
            color: 'var(--color-accent-shadow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Flame size={18} />
        </div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Nutrients Consumed Today</h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 'var(--space-sm)',
        }}
      >
        {totals.map((nutrient) => {
          const numAmount = parseFloat(nutrient.amount) || 0;
          const displayAmount = numAmount >= 100 ? Math.round(numAmount) : Math.round(numAmount * 10) / 10;

          return (
            <div
              key={nutrient.name}
              style={{
                backgroundColor: 'var(--bg-surface-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {nutrient.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {displayAmount}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {nutrient.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
