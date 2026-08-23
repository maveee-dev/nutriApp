import { SHADOW_CLINICAL_FIXTURES } from './shadow-clinical-fixtures.js';
import { ShadowClinicalFixtureValidationService } from './shadow-clinical-validation.service.js';

const meal = (mealType: string, policyIds: readonly string[]) => ({
  mealType, templateId: `template-${mealType}`, templateVersionId: `template-version-${mealType}`, templateVersion: 1, templateName: `${mealType} complete meal`, cuisine: 'Test', slotIds: [`slot-${mealType}`],
  resolvedSources: [{ slotId: `slot-${mealType}`, source: 'recipe' as const, sourceId: `recipe-version-${mealType}`, label: `${mealType} recipe` }],
  components: [{ id: `component-${mealType}`, foodId: `food-${mealType}`, foodName: 'Chicken and rice meal', servingId: `serving-${mealType}`, servingName: '1 serving', servingGrams: '100', role: 'MAIN_DISH', quantity: '1', unit: 'SERVING', displayOrder: 0, notes: null }],
  templateProvenance: { sourceType: 'OFFICIAL', sourceName: 'Fixture', sourceUrl: null, sourceReference: null, sourceVersion: '1', approvalStatus: 'APPROVED' },
  evaluation: {
    recipeId: `meal-${mealType}`, recipeVersionId: `recipe-version-${mealType}`, recipeVersion: 1, portionGrams: '100',
    evaluation: { score: 85, coverage: 100, reasons: [], contributions: [], deferredPolicies: [] },
    targetCalculation: { targets: { sodiumMilligrams: '2300', proteinGrams: '100' }, adjustments: [], deferredPolicies: [], targetProvenance: policyIds.map((policyId) => ({ target: 'sodiumMilligrams', policyId, source: 'fixture', version: 'v1', explanation: 'Fixture evidence' })) },
    components: [], provenance: { evaluatorVersion: 'food-evaluation-v1', policySetFingerprint: 'policy-set-fixture', recipeFingerprint: `fingerprint-${mealType}`, canonicalFoods: [{ foodId: `food-${mealType}`, servingId: `serving-${mealType}`, servingGrams: '100', source: 'USDA', sourceId: `usda-${mealType}`, nutrientFingerprint: `nutrient-${mealType}` }] }, limitations: [],
  },
  rankInputs: { clinicalEligibility: 1, mealCompleteness: 1, compatibilityScore: 85, evidenceCoverage: 100, activePolicyCoverage: policyIds.length }, tieBreaker: mealType,
});

function run(
  fixture: typeof SHADOW_CLINICAL_FIXTURES[number],
  deferredPolicyIds: readonly { policyId: string; reason: string; explanation: string }[] = fixture.expectedDeferredPolicyIds.map((policyId) => ({
    policyId,
    reason: 'fixture-evidence-unavailable',
    explanation: `Fixture evidence for ${policyId} is unavailable or not current.`,
  })),
) {
  const policyIds = [...new Set(['general-nutrition-sodium-v1', ...fixture.expectedPolicyIds])];
  const selected = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].map((mealType) => meal(mealType, policyIds));
  const aggregate = selected[0]?.evaluation;
  if (aggregate == null) throw new Error('Fixture aggregate could not be constructed.');
  const aggregateEvaluation = {
    ...aggregate,
    evaluation: { ...aggregate.evaluation, deferredPolicies: deferredPolicyIds },
    targetCalculation: { ...aggregate.targetCalculation, deferredPolicies: deferredPolicyIds },
  };
  return {
    shadowPlan: { apiVersion: 'shadow-v1', userId: 'fixture-user', date: '2026-08-20', asOf: '2026-08-20T23:59:59.999Z', evaluatedCandidateCount: selected.length, candidates: selected, selected, provenance: { planner: 'recipe-template-shadow-planner', selection: 'deterministic-ranked-shadow-only', policySetFingerprints: ['policy-set-fixture'] } },
    dailyAggregate: { apiVersion: 'shadow-daily-aggregate-v1', userId: 'fixture-user', date: '2026-08-20', asOf: '2026-08-20T23:59:59.999Z', selectedMealTypes: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'], missingMealTypes: [], evaluation: aggregateEvaluation, limitations: [], provenance: { planner: 'recipe-template-shadow-planner', templateVersionIds: selected.map(({ templateVersionId }) => templateVersionId), recipeVersionIds: selected.flatMap(({ resolvedSources }) => resolvedSources.map(({ sourceId }) => sourceId)), policySetFingerprint: 'policy-set-fixture', dailyPlanFingerprint: 'daily-fingerprint' } },
  };
}

describe('shadow clinical fixture validation', () => {
  const validator = new ShadowClinicalFixtureValidationService();

  it.each(SHADOW_CLINICAL_FIXTURES)('passes the deterministic fixture contract for $id', (fixture) => {
    const fixtureRun = run(fixture);
    const report = validator.validate({ fixture, run: { first: fixtureRun as never, second: fixtureRun as never } });

    expect(report.pass).toBe(true);
    expect(report.selectedMealPlan).toHaveLength(4);
    expect(report.aggregateDailyEvaluation).toEqual({ score: 85, coverage: 100 });
    expect(report.deterministicFingerprints.first).toBe(report.deterministicFingerprints.second);
  });

  it('requires a missing individualized target to remain deferred', () => {
    const fixture = { ...SHADOW_CLINICAL_FIXTURES.find(({ id }) => id === 'diabetes')!, id: 'diabetes-missing-target', expectedPolicyIds: [], expectedDeferredPolicyIds: ['diabetes-carbohydrate-target-v1'] };
    const fixtureRun = run(fixture, [{ policyId: 'diabetes-carbohydrate-target-v1', reason: 'missing-individualized-carbohydrate-target', explanation: 'Approved individualized evidence is missing.' }]);
    const report = validator.validate({ fixture, run: { first: fixtureRun as never, second: fixtureRun as never } });

    expect(report.pass).toBe(true);
    expect(report.deferredPolicies).toEqual(['diabetes-carbohydrate-target-v1']);
  });

  it('fails a standalone alcohol meal and a non-reproducible second run', () => {
    const fixture = SHADOW_CLINICAL_FIXTURES[0]!;
    const first = run(fixture);
    const unsafe = { ...first, shadowPlan: { ...first.shadowPlan, selected: first.shadowPlan.selected.map((candidate, index) => index === 0 ? { ...candidate, components: [{ ...candidate.components[0]!, foodName: 'Beer' }] } : candidate) } };
    const changed = { ...first, shadowPlan: { ...first.shadowPlan, selected: first.shadowPlan.selected.slice(1) } };
    const report = validator.validate({ fixture, run: { first: unsafe as never, second: changed as never } });

    expect(report.pass).toBe(false);
    expect(report.failures).toEqual(expect.arrayContaining(['inappropriate-standalone-food:breakfast', 'non-deterministic-repeated-run-output']));
  });
});
