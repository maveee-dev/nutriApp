import { jest } from '@jest/globals';
import { PlannerComparisonService } from './planner-comparison.service.js';

const production = {
  apiVersion: 'v1', date: '2026-08-20', asOf: '2026-08-20T23:59:59.999Z',
  items: [{ mealType: 'LUNCH', foodId: 'food-1', foodName: 'Chicken', servingId: 'serving-1', servingName: '1 serving', servingGrams: '100', quantity: '1', category: 'Meal', evaluation: { score: 60, coverage: 0.8, reasons: [], contributions: [] } }],
  targets: { sodiumMilligrams: '2300', proteinGrams: '100' }, targetProvenance: [], deferredPolicies: [], policySetFingerprint: 'policy-set-1',
  provenance: { foodSource: 'canonical-food-database', selection: 'production', evaluatorVersion: 'food-evaluation-v1' }, limitations: [],
};

const shadow = {
  apiVersion: 'shadow-v1', userId: 'user-1', date: '2026-08-20', asOf: '2026-08-20T23:59:59.999Z', evaluatedCandidateCount: 2,
  candidates: [],
  selected: [{
    mealType: 'LUNCH', templateId: 'template-1', templateVersionId: 'template-version-1', templateVersion: 1, templateName: 'Lunch pattern', cuisine: 'Filipino', slotIds: ['slot-1'],
    resolvedSources: [{ slotId: 'slot-1', source: 'recipe', sourceId: 'recipe-version-1', label: 'Chicken Adobo' }],
    templateProvenance: { sourceType: 'OFFICIAL', sourceName: 'Test', sourceUrl: null, sourceReference: null, sourceVersion: '1', approvalStatus: 'APPROVED' },
    evaluation: { recipeId: 'shadow', recipeVersionId: 'shadow-version', recipeVersion: 1, portionGrams: '100', evaluation: { score: 80, coverage: 1, reasons: [], contributions: [], deferredPolicies: [] }, targetCalculation: { targets: { sodiumMilligrams: '2300', proteinGrams: '100' }, adjustments: [], deferredPolicies: [], targetProvenance: [] }, components: [], provenance: { evaluatorVersion: 'food-evaluation-v1', policySetFingerprint: 'policy-set-1', recipeFingerprint: 'fingerprint', canonicalFoods: [] }, limitations: [] },
    rankInputs: { clinicalEligibility: 1, mealCompleteness: 1, compatibilityScore: 80, evidenceCoverage: 1, activePolicyCoverage: 2 }, tieBreaker: 'template-1',
  }],
  provenance: { planner: 'recipe-template-shadow-planner', selection: 'deterministic-ranked-shadow-only', policySetFingerprints: ['policy-set-1'] },
};

describe('PlannerComparisonService', () => {
  it('executes both planners with the same user/date and explains differences', async () => {
    const productionGenerate = jest.fn().mockResolvedValue(production);
    const shadowGenerate = jest.fn().mockResolvedValue(shadow);
    const service = new PlannerComparisonService({ generate: productionGenerate } as never, { generate: shadowGenerate } as never);

    const result = await service.compare('user-1', '2026-08-20');

    expect(productionGenerate).toHaveBeenCalledWith('user-1', '2026-08-20');
    expect(shadowGenerate).toHaveBeenCalledWith('user-1', '2026-08-20');
    const lunch = result.comparisons.find(({ mealType }) => mealType === 'LUNCH');
    expect(lunch?.scoreDelta).toBe(20);
    expect(lunch?.evidenceCoverageDelta).toBeCloseTo(0.2);
    expect(lunch?.differences).toEqual(expect.arrayContaining(['selected-source-differs', 'shadow-uses-approved-recipe']));
  });

  it('reports missing selections without changing either planner result', async () => {
    const service = new PlannerComparisonService(
      { generate: jest.fn().mockResolvedValue({ ...production, items: [] }) } as never,
      { generate: jest.fn().mockResolvedValue({ ...shadow, selected: [], evaluatedCandidateCount: 0 }) } as never,
    );

    const result = await service.compare('user-1', '2026-08-20');

    const lunch = result.comparisons.find(({ mealType }) => mealType === 'LUNCH');
    expect(lunch?.production.selected).toBe(false);
    expect(lunch?.shadow.selected).toBe(false);
    expect(lunch?.differences).toEqual(['production-planner-no-selection', 'shadow-planner-no-selection']);
  });
});
