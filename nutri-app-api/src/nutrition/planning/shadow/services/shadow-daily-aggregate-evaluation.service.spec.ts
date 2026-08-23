import { jest } from '@jest/globals';
import { ShadowDailyAggregateEvaluationService } from './shadow-daily-aggregate-evaluation.service.js';

const candidate = (mealType: string, templateVersionId: string, sourceId: string) => ({
  mealType, templateId: `template-${mealType}`, templateVersionId, templateVersion: 1, templateName: `${mealType} meal`, cuisine: 'Test', slotIds: ['slot-1'],
  resolvedSources: [{ slotId: 'slot-1', source: 'recipe' as const, sourceId, label: `${mealType} recipe` }],
  components: [{ id: 'component-1', foodId: `food-${mealType}`, foodName: `${mealType} food`, servingId: `serving-${mealType}`, servingName: '1 serving', servingGrams: '100', role: 'MAIN_DISH', quantity: '1', unit: 'SERVING', displayOrder: 0, notes: null }],
  templateProvenance: { sourceType: 'OFFICIAL', sourceName: 'Test', sourceUrl: null, sourceReference: null, sourceVersion: '1', approvalStatus: 'APPROVED' },
  evaluation: { recipeId: `meal-${mealType}`, recipeVersionId: sourceId, recipeVersion: 1, portionGrams: '100', evaluation: { score: 80, coverage: 1, reasons: [], contributions: [], deferredPolicies: [] }, targetCalculation: { targets: { sodiumMilligrams: '2300', proteinGrams: '100' }, adjustments: [], deferredPolicies: [], targetProvenance: [] }, components: [], provenance: { evaluatorVersion: 'food-evaluation-v1', policySetFingerprint: 'policy-set-1', recipeFingerprint: `fingerprint-${mealType}`, canonicalFoods: [] }, limitations: [] },
  rankInputs: { clinicalEligibility: 1, mealCompleteness: 1, compatibilityScore: 80, evidenceCoverage: 1, activePolicyCoverage: 2 }, tieBreaker: mealType,
});

const plan = (selected: readonly unknown[]) => ({
  apiVersion: 'shadow-v1', userId: 'user-1', date: '2026-08-20', asOf: '2026-08-20T23:59:59.999Z', evaluatedCandidateCount: selected.length, candidates: selected, selected,
  provenance: { planner: 'recipe-template-shadow-planner', selection: 'deterministic-ranked-shadow-only', policySetFingerprints: ['policy-set-1'] },
});

describe('ShadowDailyAggregateEvaluationService', () => {
  it('aggregates all selected meal components through RecipeEvaluationService', async () => {
    const evaluateComposition = jest.fn().mockResolvedValue({
      recipeId: 'shadow-day', recipeVersionId: 'shadow-day', recipeVersion: 1, portionGrams: '400',
      evaluation: { score: 72, coverage: 1, reasons: [], contributions: [], deferredPolicies: [] },
      targetCalculation: { targets: { sodiumMilligrams: '2300', proteinGrams: '100' }, adjustments: [], deferredPolicies: [], targetProvenance: [] },
      components: [], provenance: { evaluatorVersion: 'food-evaluation-v1', policySetFingerprint: 'policy-set-1', recipeFingerprint: 'aggregate-fingerprint', canonicalFoods: [] }, limitations: [],
    });
    const service = new ShadowDailyAggregateEvaluationService({ evaluateComposition } as never, { generate: jest.fn() } as never);
    const selected = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].map((type) => candidate(type, `version-${type}`, `recipe-${type}`));

    const result = await service.evaluate('user-1', plan(selected) as never);

    expect(evaluateComposition).toHaveBeenCalledTimes(1);
    expect(evaluateComposition.mock.calls[0]?.[1].components).toHaveLength(4);
    expect(result.selectedMealTypes).toEqual(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']);
    expect(result.missingMealTypes).toEqual([]);
    expect(result.provenance.recipeVersionIds).toEqual(['recipe-BREAKFAST', 'recipe-LUNCH', 'recipe-DINNER', 'recipe-SNACK']);
    expect(result.provenance.dailyPlanFingerprint).toHaveLength(64);
  });

  it('reports incomplete plans and preserves deterministic policy limitations', async () => {
    const evaluateComposition = jest.fn().mockResolvedValue({
      recipeId: 'shadow-day', recipeVersionId: 'shadow-day', recipeVersion: 1, portionGrams: '100',
      evaluation: { score: 30, coverage: 1, reasons: [{ code: 'high-sodium', direction: 'negative', nutrient: 'sodium', measuredValue: '3000', targetValue: '2300', explanation: 'over target' }], contributions: [], deferredPolicies: [{ policyId: 'diabetes-carbohydrate-target-v1', reason: 'missing', explanation: 'missing target' }] },
      targetCalculation: { targets: { sodiumMilligrams: '2300', proteinGrams: '100' }, adjustments: [], deferredPolicies: [], targetProvenance: [] },
      components: [], provenance: { evaluatorVersion: 'food-evaluation-v1', policySetFingerprint: 'policy-set-1', recipeFingerprint: 'aggregate-fingerprint', canonicalFoods: [] }, limitations: ['canonical-data-current'],
    });
    const service = new ShadowDailyAggregateEvaluationService({ evaluateComposition } as never, { generate: jest.fn() } as never);

    const result = await service.evaluate('user-1', plan([candidate('LUNCH', 'version-lunch', 'recipe-lunch')]) as never);

    expect(result.missingMealTypes).toEqual(['BREAKFAST', 'DINNER', 'SNACK']);
    expect(result.limitations).toEqual(expect.arrayContaining([
      'daily-plan-incomplete:breakfast',
      'deferred-policy:diabetes-carbohydrate-target-v1',
      'daily-policy-constraint-not-satisfied:sodium',
      'canonical-data-current',
    ]));
  });

  it('returns a deterministic empty result when no shadow meals are selected', async () => {
    const service = new ShadowDailyAggregateEvaluationService({ evaluateComposition: jest.fn() } as never, { generate: jest.fn() } as never);

    const result = await service.evaluate('user-1', plan([]) as never);

    expect(result.evaluation).toBeNull();
    expect(result.provenance.dailyPlanFingerprint).toBeNull();
    expect(result.limitations).toContain('daily-plan-no-evaluable-meals');
  });
});
