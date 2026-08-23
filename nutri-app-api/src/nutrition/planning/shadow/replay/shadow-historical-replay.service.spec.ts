import { jest } from '@jest/globals';
import { ShadowHistoricalReplayService } from './shadow-historical-replay.service.js';

const targetCalculation = { targets: { sodiumMilligrams: '2300', proteinGrams: '100' }, adjustments: [], deferredPolicies: [], targetProvenance: [{ target: 'sodiumMilligrams', policyId: 'general-nutrition-sodium-v1', source: 'fixture', version: 'v1', explanation: 'fixture' }] };
const component = { id: 'component-1', foodId: 'food-1', foodName: 'Chicken and rice', servingId: 'serving-1', servingName: '1 serving', servingGrams: '100', role: 'MAIN_DISH', quantity: '1', unit: 'SERVING', displayOrder: 0, notes: null };
const evaluation = (recipeId: string, recipeVersionId: string, fingerprint: string, deferredPolicies = []) => ({
  recipeId, recipeVersionId, recipeVersion: 1, portionGrams: '100', evaluation: { score: 80, coverage: 100, reasons: [], contributions: [], deferredPolicies }, targetCalculation, components: [], provenance: { evaluatorVersion: 'food-evaluation-v1', policySetFingerprint: 'policy-set-1', recipeFingerprint: fingerprint, canonicalFoods: [{ foodId: 'food-1', servingId: 'serving-1', servingGrams: '100', source: 'USDA', sourceId: 'usda-1', nutrientFingerprint: 'nutrient-1' }] }, limitations: [],
});

function run(dailyAggregate: Record<string, unknown> | null = null) {
  const mealEvaluation = evaluation('meal-1', 'meal-evaluation-version', 'meal-fingerprint');
  const meal = { mealType: 'LUNCH', templateId: 'template-1', templateVersionId: 'template-version-1', templateVersion: 1, templateName: 'Lunch', cuisine: 'Test', slotIds: ['slot-1'], resolvedSources: [{ slotId: 'slot-1', source: 'recipe' as const, sourceId: 'recipe-version-1', label: 'Chicken and rice' }], components: [component], templateProvenance: { sourceType: 'OFFICIAL', sourceName: 'Fixture', sourceUrl: null, sourceReference: null, sourceVersion: '1', approvalStatus: 'APPROVED' }, evaluation: mealEvaluation, rankInputs: { clinicalEligibility: 1, mealCompleteness: 1, compatibilityScore: 80, evidenceCoverage: 100, activePolicyCoverage: 2 }, tieBreaker: 'lunch' };
  const aggregateEvaluation = dailyAggregate ?? evaluation('daily-1', 'daily-evaluation-version', 'daily-fingerprint');
  return { shadowPlan: { apiVersion: 'shadow-v1', userId: 'user-1', date: '2026-08-20', asOf: '2026-08-20T23:59:59.999Z', evaluatedCandidateCount: 1, candidates: [meal], selected: [meal], provenance: { planner: 'recipe-template-shadow-planner', selection: 'deterministic-ranked-shadow-only', policySetFingerprints: ['policy-set-1'] } }, dailyAggregate: { apiVersion: 'shadow-daily-aggregate-v1', userId: 'user-1', date: '2026-08-20', asOf: '2026-08-20T23:59:59.999Z', selectedMealTypes: ['LUNCH'], missingMealTypes: ['BREAKFAST', 'DINNER', 'SNACK'], evaluation: aggregateEvaluation, limitations: [], provenance: { planner: 'recipe-template-shadow-planner', templateVersionIds: ['template-version-1'], recipeVersionIds: ['recipe-version-1'], policySetFingerprint: 'policy-set-1', dailyPlanFingerprint: 'daily-plan-fingerprint' } } };
}

describe('ShadowHistoricalReplayService', () => {
  it('replays the same versioned plan with identical fingerprints and provenance', async () => {
    const evaluateComposition = jest.fn().mockImplementation(async (_userId: string, input: { recipeId: string; recipeVersionId: string }, options: { targetCalculation: unknown; policySetFingerprint: string }) => evaluation(input.recipeId, input.recipeVersionId, input.recipeId === 'daily-1' ? 'daily-fingerprint' : 'meal-fingerprint'));
    const service = new ShadowHistoricalReplayService({ evaluateComposition } as never);
    const snapshot = service.capture(run() as never);

    const replay = await service.replay(snapshot);

    expect(replay.replayable).toBe(true);
    expect(replay.failureReasons).toEqual([]);
    expect(replay.provenancePreserved).toBe(true);
    expect(evaluateComposition).toHaveBeenCalledTimes(2);
    expect(evaluateComposition.mock.calls[0]?.[2]).toMatchObject({ targetCalculation, policySetFingerprint: 'policy-set-1' });
  });

  it('replays immutable historical composition after newer versions exist', async () => {
    const evaluateComposition = jest.fn().mockImplementation(async (_userId: string, input: { recipeId: string; recipeVersionId: string }) => evaluation(input.recipeId, input.recipeVersionId, input.recipeId === 'daily-1' ? 'daily-fingerprint' : 'meal-fingerprint'));
    const service = new ShadowHistoricalReplayService({ evaluateComposition } as never);
    const snapshot = service.capture(run() as never);
    const newerVersions = { templateVersionId: 'template-version-2', recipeVersionId: 'recipe-version-2' };

    const replay = await service.replay(snapshot);

    expect(newerVersions).toBeDefined();
    expect(replay.replayable).toBe(true);
    expect(snapshot.meals[0]?.templateVersionId).toBe('template-version-1');
    expect(snapshot.meals[0]?.recipeVersionIds).toEqual(['recipe-version-1']);
  });

  it('preserves deferred policies, empty plans, and unsupported-condition replay', async () => {
    const evaluateComposition = jest.fn().mockImplementation(async (_userId: string, input: { recipeId: string; recipeVersionId: string }, options: { targetCalculation: typeof targetCalculation }) => evaluation(input.recipeId, input.recipeVersionId, input.recipeId === 'daily-1' ? 'daily-fingerprint' : 'meal-fingerprint', options.targetCalculation.deferredPolicies));
    const service = new ShadowHistoricalReplayService({ evaluateComposition } as never);
    const deferred = { ...targetCalculation, deferredPolicies: [{ policyId: 'diabetes-carbohydrate-target-v1', reason: 'missing', explanation: 'fixture' }] };
    const deferredRun = run({ ...evaluation('daily-1', 'daily-evaluation-version', 'daily-fingerprint', [{ policyId: 'diabetes-carbohydrate-target-v1', reason: 'missing', explanation: 'fixture' }]), targetCalculation: deferred });
    const deferredSnapshot = service.capture(deferredRun as never);
    const emptySnapshot = service.capture({ ...run(), shadowPlan: { ...run().shadowPlan, selected: [], candidates: [] }, dailyAggregate: { ...run().dailyAggregate, evaluation: null } } as never);

    expect((await service.replay(deferredSnapshot)).replayable).toBe(true);
    expect((await service.replay(emptySnapshot)).replayable).toBe(true);
    expect((await service.replay(emptySnapshot)).replayedMealEvaluations).toEqual([]);
  });

  it('reports canonical Food mutation instead of claiming exact replay', async () => {
    const evaluateComposition = jest.fn().mockImplementation(async (_userId: string, input: { recipeId: string; recipeVersionId: string }) => ({ ...evaluation(input.recipeId, input.recipeVersionId, input.recipeId === 'daily-1' ? 'daily-fingerprint' : 'meal-fingerprint'), provenance: { ...evaluation(input.recipeId, input.recipeVersionId, 'changed').provenance, canonicalFoods: [{ ...evaluation(input.recipeId, input.recipeVersionId, 'changed').provenance.canonicalFoods[0]!, nutrientFingerprint: 'changed-nutrients' }] } }));
    const service = new ShadowHistoricalReplayService({ evaluateComposition } as never);

    const replay = await service.replay(service.capture(run() as never));

    expect(replay.replayable).toBe(false);
    expect(replay.failureReasons).toEqual(expect.arrayContaining(['canonical-food-fingerprint-mismatch:meal:LUNCH', 'canonical-food-fingerprint-mismatch:daily-aggregate']));
  });
});
