import { FoodEvaluationEngine } from './food-evaluation.engine.js';
import { NutritionPolicyDeferralSource } from '../../analysis/types/nutrition-targets.type.js';

describe('FoodEvaluationEngine', () => {
  const engine = new FoodEvaluationEngine();
  const calculation = (proteinGrams: string | null = '60', deferredPolicies: NutritionPolicyDeferralSource[] = []) => ({
    targets: { sodiumMilligrams: '2300', proteinGrams },
    adjustments: [],
    deferredPolicies,
  });

  it('scores a portion deterministically using sodium and protein', () => {
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '100' },
        { name: 'Protein', unit: 'g', amountPer100Grams: '20' },
      ],
      portionGrams: '200',
      targets: calculation().targets,
      targetCalculation: calculation(),
    });

    expect(result.score).toBe(100);
    expect(result.reasons.map(({ code }) => code)).toEqual([
      'sodium-contribution',
      'protein-contribution',
    ]);
  });

  it('reports sodium above target and preserves deferred policies', () => {
    const deferred = [{
      policyId: 'ckd-protein',
      reason: 'missing-egfr',
      explanation: 'Provide a current eGFR result.',
    }];
    const targetCalculation = calculation(null, deferred);
    const result = engine.evaluate({
      nutrients: [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '1500' }],
      portionGrams: '200',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(40);
    expect(result.reasons[0]).toMatchObject({
      code: 'sodium-above-target',
      direction: 'negative',
      measuredValue: '3000',
      targetValue: '2300',
    });
    expect(result.deferredPolicies).toEqual(deferred);
  });

  it('does not invent a protein penalty when the target is unavailable', () => {
    const targetCalculation = calculation(null);
    const result = engine.evaluate({
      nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '5' }],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(100);
    expect(result.reasons).toEqual([]);
  });
});
