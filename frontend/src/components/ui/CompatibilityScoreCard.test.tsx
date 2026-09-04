import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompatibilityScoreCard } from './CompatibilityScoreCard';

describe('CompatibilityScoreCard', () => {
  it('keeps partial scores secondary and explains the coverage limitation', () => {
    render(<CompatibilityScoreCard score={100} partial />);

    expect(screen.getByRole('region', { name: 'Compatibility score' })).toBeInTheDocument();
    expect(screen.getByText('Compatibility check is incomplete')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Supporting score' })).toBeInTheDocument();
    expect(screen.getByLabelText('100 out of 100')).toBeInTheDocument();
    expect(screen.queryByText('Looks like a great fit')).not.toBeInTheDocument();
  });

  it('preserves the complete evaluation treatment', () => {
    render(<CompatibilityScoreCard score={86} />);

    expect(screen.getByRole('heading', { name: 'Compatibility score' })).toBeInTheDocument();
    expect(screen.getByText('Looks like a great fit')).toBeInTheDocument();
    expect(screen.getByText('Complete check')).toBeInTheDocument();
  });
});
