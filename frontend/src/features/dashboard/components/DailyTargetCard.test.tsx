import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DailyTargetCard } from './DailyTargetCard';

describe('DailyTargetCard semantic presentation', () => {
  it('uses allowance language for limits and progress language for adequacy targets', () => {
    render(
      <DailyTargetCard
        targets={{ sodiumMilligrams: '2300', proteinGrams: '64' }}
        totals={[
          { name: 'Sodium', unit: 'mg', amount: '2400' },
          { name: 'Protein', unit: 'g', amount: '1' },
        ]}
        targetProvenance={[{
          target: 'proteinGrams',
          policyId: 'ckd-non-dialysis-protein-v1',
          source: 'KDOQI',
          version: 'v1',
          explanation: 'Approved protein target.',
        }]}
      />,
    );

    expect(screen.getByText('100 mg over your daily allowance')).toBeInTheDocument();
    expect(screen.getByText('63 g to your daily target')).toBeInTheDocument();
    expect(screen.queryByText(/over this goal/i)).not.toBeInTheDocument();
  });
});
