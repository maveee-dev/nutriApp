import React from 'react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { DailyNutritionTarget, DailyNutritionTotal } from '../types/daily-tracker.types';

interface NutrientDefinition {
  key: string;
  label: string;
  unit: string;
  kind: 'upper' | 'lower';
}

const NUTRIENTS: readonly NutrientDefinition[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', kind: 'lower' },
  { key: 'protein', label: 'Protein', unit: 'g', kind: 'lower' },
  { key: 'carbohydrates', label: 'Carbohydrates', unit: 'g', kind: 'lower' },
  { key: 'fat', label: 'Fat', unit: 'g', kind: 'upper' },
  { key: 'fiber', label: 'Fiber', unit: 'g', kind: 'lower' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', kind: 'upper' },
  { key: 'potassium', label: 'Potassium', unit: 'mg', kind: 'upper' },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg', kind: 'upper' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', kind: 'upper' },
];

function displayAmount(amount: string | null | undefined): string {
  if (amount == null) return '—';
  const parsed = Number.parseFloat(amount);
  if (!Number.isFinite(parsed)) return amount;
  return parsed >= 100 ? Math.round(parsed).toString() : (Math.round(parsed * 10) / 10).toString();
}

export interface DailyNutritionProgressCardProps {
  totals: Record<string, DailyNutritionTotal>;
  targets: Record<string, DailyNutritionTarget>;
}

export const DailyNutritionProgressCard: React.FC<DailyNutritionProgressCardProps> = ({ totals, targets }) => {
  const visibleNutrients = NUTRIENTS.filter((nutrient) => totals[nutrient.key] != null || targets[nutrient.key] != null);

  return (
    <Card>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 750, marginBottom: 'var(--space-md)' }}>Nutrient progress</h2>
      {visibleNutrients.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Add food to start building your daily nutrition picture.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {visibleNutrients.map((nutrient) => {
            const total = totals[nutrient.key];
            const target = targets[nutrient.key];
            const unit = total?.unit ?? nutrient.unit;
            const current = total?.amount ?? target?.current ?? '0';
            const targetValue = target?.target ?? null;
            const currentNumber = Number.parseFloat(current);
            const targetNumber = targetValue == null ? 0 : Number.parseFloat(targetValue);
            const progressMeaning = target?.kind === 'UPPER_LIMIT' || nutrient.kind === 'upper' ? 'upper-limit' : 'adequacy-target';
            return (
              <div key={nutrient.key}>
                {targetValue != null && Number.isFinite(targetNumber) ? (
                  <ProgressBar
                    label={nutrient.label}
                    value={Number.isFinite(currentNumber) ? Number(displayAmount(current)) : 0}
                    max={Number(targetValue)}
                    unit={unit}
                    meaning={progressMeaning}
                    variant={progressMeaning === 'upper-limit' ? 'dynamic' : 'accent'}
                    size="sm"
                  />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <strong style={{ fontSize: '0.9rem' }}>{nutrient.label}</strong>
                    <span style={{ fontWeight: 750 }}>{displayAmount(current)} {unit}</span>
                  </div>
                )}
                {targetValue == null ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Target not configured</p>
                ) : target?.current == null ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Intake amount unavailable from the recorded food data</p>
                ) : target.status === 'over-limit' ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '4px' }}>{displayAmount(target.remaining)} {unit} remaining (over limit)</p>
                ) : target.status === 'below-target' ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{displayAmount(target.remaining)} {unit} to target</p>
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{displayAmount(target.remaining)} {unit} remaining</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

