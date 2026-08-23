import { GeneralUpperLimitRecommendationPolicy } from './upper-limit-recommendation.policy.js';

describe('GeneralUpperLimitRecommendationPolicy', () => {
  it('creates deterministic caution guidance from an active added-sugar target', () => {
    const policy = new GeneralUpperLimitRecommendationPolicy('added-sugar', 'added sugar', 'g');
    const snapshot = {
      id: 'snapshot-1', mealItemId: 'item-1', score: 20, coverage: 100,
      payload: {
        reasons: [{ code: 'added-sugar-above-target', direction: 'negative', nutrient: 'added-sugar', measuredValue: '60', targetValue: '50', explanation: 'Above target.' }],
        contributions: [{ nutrient: 'added-sugar', amount: '60', targetValue: '50', currentDailyValue: null, explanation: 'Contribution.' }],
        targets: { sodiumMilligrams: '2300', proteinGrams: null, addedSugarGrams: '50' }, deferredPolicies: [],
      }, evaluatorVersion: 'food-evaluation-v1', policyVersion: 'nutrition-policies-v1', snapshotVersion: '1', evaluatedAt: new Date('2026-08-19T12:00:00.000Z'),
    } as any;
    const [candidate] = policy.evaluate({ contextId: 'ctx', userId: 'user-1', scope: 'current-food', asOf: snapshot.evaluatedAt.toISOString(), projection: { snapshot, payload: snapshot.payload }, sources: [] });
    expect(candidate.recommendation).toMatchObject({ category: 'caution', nutrient: 'added-sugar' });
    expect(candidate.recommendation.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ source: expect.objectContaining({ sourceId: 'snapshot-1' }) })]));
  });

  it('does not create a current cholesterol recommendation from contribution-only evidence', () => {
    const policy = new GeneralUpperLimitRecommendationPolicy('cholesterol', 'cholesterol', 'mg');
    const snapshot = {
      id: 'snapshot-current', mealItemId: 'item-current', score: 100, coverage: 100,
      payload: {
        reasons: [],
        contributions: [{ nutrient: 'cholesterol', amount: '170', targetValue: null, currentDailyValue: null, explanation: 'Contribution.' }],
        targets: { sodiumMilligrams: '2300', proteinGrams: null }, deferredPolicies: [],
      }, evaluatorVersion: 'food-evaluation-v4', policyVersion: 'nutrition-policies-v2', snapshotVersion: '2', evaluatedAt: new Date('2026-08-22T12:00:00.000Z'),
    } as any;

    expect(policy.evaluate({ contextId: 'ctx-current', userId: 'user-1', scope: 'current-food', asOf: snapshot.evaluatedAt.toISOString(), projection: { snapshot, payload: snapshot.payload }, sources: [] })).toEqual([]);
  });

  it('preserves the legacy cholesterol recommendation when replaying a v1 snapshot', () => {
    const policy = new GeneralUpperLimitRecommendationPolicy('cholesterol', 'cholesterol', 'mg');
    const snapshot = {
      id: 'snapshot-legacy', mealItemId: 'item-legacy', score: 20, coverage: 100,
      payload: {
        reasons: [{ code: 'cholesterol-above-target', direction: 'negative', nutrient: 'cholesterol', measuredValue: '400', targetValue: '300', explanation: 'Above target.' }],
        contributions: [{ nutrient: 'cholesterol', amount: '400', targetValue: '300', currentDailyValue: null, explanation: 'Legacy contribution.' }],
        targets: { sodiumMilligrams: '2300', proteinGrams: null, cholesterolMilligrams: '300' }, deferredPolicies: [],
      }, evaluatorVersion: 'food-evaluation-v3', policyVersion: 'nutrition-policies-v1', snapshotVersion: '1', evaluatedAt: new Date('2026-08-19T12:00:00.000Z'),
    } as any;

    const [candidate] = policy.evaluate({ contextId: 'ctx-legacy', userId: 'user-1', scope: 'historical', asOf: snapshot.evaluatedAt.toISOString(), projection: { snapshot, payload: snapshot.payload }, sources: [] });

    expect(candidate.recommendation).toMatchObject({ category: 'caution', nutrient: 'cholesterol' });
  });
});
