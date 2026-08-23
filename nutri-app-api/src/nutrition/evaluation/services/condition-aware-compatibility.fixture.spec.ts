import { FoodEvaluationEngine } from './food-evaluation.engine.js';
import type { NutritionTargetCalculation } from '../../analysis/types/nutrition-targets.type.js';

const engine = new FoodEvaluationEngine();

function calculation(targets: NutritionTargetCalculation['targets'], policyIds: readonly string[] = [], deferredPolicies: NutritionTargetCalculation['deferredPolicies'] = []): NutritionTargetCalculation {
  return {
    targets,
    adjustments: [],
    deferredPolicies,
    targetProvenance: policyIds.map((policyId) => ({
      target: policyId.includes('carbohydrate') ? 'carbohydrateGrams' : 'proteinGrams',
      policyId,
      source: 'fixture-policy',
      version: 'v1',
      explanation: 'Approved fixture evidence.',
    } as NutritionTargetCalculation['targetProvenance'][number])),
  };
}

describe('condition-aware compatibility fixtures', () => {
  it.each([
    ['general adult positive', { sodiumMilligrams: '2300', proteinGrams: null }, [], [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '100' }], 'evaluated'],
    ['hypertension negative', { sodiumMilligrams: '1500', proteinGrams: null }, [], [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '1600' }], 'evaluated'],
    ['diabetes positive', { sodiumMilligrams: '2300', proteinGrams: null, carbohydrateGrams: '180' }, ['diabetes-carbohydrate-target-v1'], [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '0' }, { name: 'Carbohydrates', unit: 'g', amountPer100Grams: '20' }], 'evaluated'],
    ['diabetes negative', { sodiumMilligrams: '2300', proteinGrams: null, carbohydrateGrams: '180' }, ['diabetes-carbohydrate-target-v1'], [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '0' }, { name: 'Carbohydrates', unit: 'g', amountPer100Grams: '200' }], 'evaluated'],
    ['ckd non-dialysis', { sodiumMilligrams: '2300', proteinGrams: '60' }, ['ckd-non-dialysis-protein-v1'], [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '0' }, { name: 'Protein', unit: 'g', amountPer100Grams: '30' }], 'evaluated'],
    ['hemodialysis', { sodiumMilligrams: '2300', proteinGrams: '75' }, ['hemodialysis-protein-v1'], [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '0' }, { name: 'Protein', unit: 'g', amountPer100Grams: '80' }], 'evaluated'],
    ['peritoneal dialysis', { sodiumMilligrams: '2300', proteinGrams: '75' }, ['peritoneal-dialysis-protein-v1'], [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '0' }, { name: 'Protein', unit: 'g', amountPer100Grams: '80' }], 'evaluated'],
    ['ckd diabetes hypertension combination', { sodiumMilligrams: '1500', proteinGrams: '60', carbohydrateGrams: '180' }, ['ckd-non-dialysis-protein-v1', 'diabetes-carbohydrate-target-v1'], [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '1600' }, { name: 'Protein', unit: 'g', amountPer100Grams: '10' }, { name: 'Carbohydrates', unit: 'g', amountPer100Grams: '200' }], 'evaluated'],
  ] as const)('%s remains deterministic and condition-aware', (_name, targets, policyIds, nutrients, status) => {
    const targetCalculation = calculation(targets, policyIds);
    const result = engine.evaluate({ nutrients, portionGrams: '100', targets, targetCalculation });

    expect(result).toEqual(engine.evaluate({ nutrients, portionGrams: '100', targets, targetCalculation }));
    expect(result.evaluationStatus).toBe(status);
    expect(result.deferredPolicies).toEqual([]);
    expect(result.reasons.length + result.contributions.length).toBeGreaterThan(0);
  });

  it('preserves an explicit unsupported-evidence deferral without converting it into approval', () => {
    const deferred = [{ policyId: 'diabetes-carbohydrate-target-v1', reason: 'missing-individualized-carbohydrate-target', explanation: 'Approved individualized evidence is missing.' }];
    const targetCalculation = calculation({ sodiumMilligrams: '2300', proteinGrams: null }, [], deferred);
    const result = engine.evaluate({ nutrients: [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '100' }], portionGrams: '100', targets: targetCalculation.targets, targetCalculation });

    expect(result.evaluationStatus).toBe('evaluated');
    expect(result.deferredPolicies).toEqual(deferred);
  });
});
