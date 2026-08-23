import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DailyCoachingCard } from './DailyCoachingCard';
import type { RecommendationItem, RecommendationResolution } from '../types/dashboard.types';

const recommendation: RecommendationItem = {
  id: 'sodium-1',
  category: 'improvement',
  disposition: 'actionable',
  severity: 'moderate',
  scope: 'daily',
  title: 'Choose a lower-sodium option next',
  message: 'You are close to your sodium target today.',
  policy: { policyId: 'general-nutrition-sodium-v1', version: 'v1', source: 'Approved guidance' },
  evidence: [{ id: 'e-1', kind: 'snapshot', source: { sourceType: 'snapshot', sourceId: 'snapshot-1' }, field: 'reasons', value: 'within-target', explanation: 'Based on today’s immutable evaluation.' }],
  actions: ['Try a fresh or unsalted option.'],
};

describe('DailyCoachingCard', () => {
  it('shows a friendly loading state', () => {
    render(<DailyCoachingCard isLoading />);
    expect(screen.getByText(/helpful next step/i)).toBeInTheDocument();
  });

  it('shows the prioritized recommendation and keeps evidence behind Why', () => {
    const resolution: RecommendationResolution = { apiVersion: 'v1', scope: 'daily', contextId: 'daily-1', asOf: '2026-08-19T00:00:00.000Z', recommendations: [recommendation], suppressed: [] };
    render(<DailyCoachingCard resolution={resolution} />);
    expect(screen.getByText(recommendation.title)).toBeInTheDocument();
    expect(screen.getByText('Try a fresh or unsalted option.')).toBeInTheDocument();
    expect(screen.getByText('Why am I seeing this?')).toBeInTheDocument();
    expect(screen.queryByText('Based on today’s immutable evaluation.')).not.toBeVisible();
  });

  it('handles an empty recommendation response without exposing technical details', () => {
    const resolution: RecommendationResolution = { apiVersion: 'v1', scope: 'daily', contextId: 'daily-1', asOf: '2026-08-19T00:00:00.000Z', recommendations: [], suppressed: [{ candidateId: 'x', reason: 'duplicate' }] };
    render(<DailyCoachingCard resolution={resolution} />);
    expect(screen.getByText(/no new coaching tip/i)).toBeInTheDocument();
    expect(screen.queryByText(/duplicate/i)).not.toBeInTheDocument();
  });
});
