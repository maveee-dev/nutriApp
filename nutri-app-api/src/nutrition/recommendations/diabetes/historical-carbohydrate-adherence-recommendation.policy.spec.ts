import { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import { DiabetesHistoricalCarbohydrateAdherenceRecommendationPolicy } from './historical-carbohydrate-adherence-recommendation.policy.js';

function summary(date: string, consumed: string, exceeded: string): DailyNutritionSummarySource {
  return {
    date, mealCount: 1, totals: [], targets: { sodiumMilligrams: '2300', proteinGrams: null }, insights: [], deferredPolicies: [], caloriesConsumedKcal: '0', remainingCaloriesKcal: null, calorieTargetPercentage: null,
    diabetesCarbohydrateAdherence: { status: 'available', targetCarbohydrateGrams: '180', consumedCarbohydrateGrams: consumed, remainingCarbohydrateGrams: exceeded === '0' ? '180' : '0', exceededByGrams: exceeded, coveragePercentage: 100, targetProvenance: { target: 'carbohydrateGrams', policyId: 'diabetes-carbohydrate-target-v1', source: 'ADA', version: 'v1', explanation: 'Approved target.' }, snapshotIds: [`snapshot-${date}`], deferredPolicy: null },
  };
}

describe('DiabetesHistoricalCarbohydrateAdherenceRecommendationPolicy', () => {
  const policy = new DiabetesHistoricalCarbohydrateAdherenceRecommendationPolicy();
  const context = (summaries: readonly DailyNutritionSummarySource[]) => ({ contextId: 'historical-user-1', userId: 'user-1', scope: 'historical' as const, asOf: '2026-08-19T23:59:59.999Z', projection: { summaries }, sources: [] });

  it('produces one consistent recommendation and preserves daily snapshot evidence', () => {
    const [candidate] = policy.evaluate(context([summary('2026-08-18', '120', '0'), summary('2026-08-19', '130', '0')]));
    expect(candidate.recommendation.category).toBe('positive');
    expect(candidate.recommendation.id).toContain('consistent');
    expect(candidate.recommendation.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ field: '2026-08-18.snapshotIds', value: 'snapshot-2026-08-18' })]));
  });

  it('produces one recurring-exceedance caution and one improvement recommendation', () => {
    const candidates = policy.evaluate(context([summary('2026-08-17', '200', '20'), summary('2026-08-18', '195', '15'), summary('2026-08-19', '190', '10')]));
    expect(candidates.filter(({ recommendation }) => recommendation.category === 'caution')).toHaveLength(1);
    expect(candidates.filter(({ recommendation }) => recommendation.category === 'improvement')).toHaveLength(1);
  });

  it('reports insufficient historical coverage deterministically', () => {
    const [candidate] = policy.evaluate(context([summary('2026-08-19', '120', '0')]));
    expect(candidate.recommendation).toMatchObject({ category: 'deferred-policy', id: 'diabetes-historical-carbohydrate-adherence-deferred-insufficient-historical-coverage' });
  });

  it('returns identical output for identical historical projections', () => {
    const input = context([summary('2026-08-18', '200', '20'), summary('2026-08-19', '195', '15')]);
    expect(policy.evaluate(input)).toEqual(policy.evaluate(input));
  });
});
