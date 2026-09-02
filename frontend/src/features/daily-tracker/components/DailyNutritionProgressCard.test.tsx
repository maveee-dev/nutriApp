import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DailyNutritionProgressCard } from './DailyNutritionProgressCard';

describe('DailyNutritionProgressCard', () => {
  it('shows progress against an active target and makes missing targets explicit', () => {
    render(
      <DailyNutritionProgressCard
        totals={{
          protein: { amount: '42.1', unit: 'g' },
          potassium: { amount: '1610', unit: 'mg' },
        }}
        targets={{
          protein: {
            current: '42.1',
            target: '50',
            remaining: '7.9',
            percentageConsumed: 84.2,
            unit: 'g',
            kind: 'LOWER_TARGET',
            status: 'below-target',
            rangeMin: null,
            rangeMax: null,
            source: 'CLINICIAN',
            approvalStatus: 'APPROVED',
          },
        }}
      />,
    );

    expect(screen.getByText(/42\.1 g/)).toBeInTheDocument();
    expect(screen.getByText(/\/ 50 g/)).toBeInTheDocument();
    expect(screen.getByText('Target not configured')).toBeInTheDocument();
    expect(screen.getByText(/1610 mg/)).toBeInTheDocument();
  });
});
