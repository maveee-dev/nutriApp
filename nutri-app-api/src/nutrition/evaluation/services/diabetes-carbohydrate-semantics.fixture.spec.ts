import { DiabetesCarbohydrateAdherencePolicy } from '../../analysis/policies/diabetes/diabetes-carbohydrate-adherence.policy.js';
import { FoodEvaluationEngine } from './food-evaluation.engine.js';
import type { NutritionTargetCalculation } from '../../analysis/types/nutrition-targets.type.js';
import type { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';

const targetProvenance = {
  target: 'carbohydrateGrams' as const,
  policyId: 'diabetes-carbohydrate-target-v1',
  source: 'ADA Standards of Care in Diabetes—2026',
  version: 'v1',
  explanation: 'Approved individualized carbohydrate target.',
};

function calculation(): NutritionTargetCalculation {
  return {
    targets: { sodiumMilligrams: '2300', proteinGrams: null, carbohydrateGrams: '180' },
    adjustments: [], deferredPolicies: [], targetProvenance: [targetProvenance],
  };
}

function snapshot(id: string, mealItemId: string, carbohydrates: string, evaluatedAt: string): MealEvaluationSnapshotSource {
  return {
    id, mealItemId, score: 100, coverage: 100, evaluatorVersion: 'food-evaluation-v3', policyVersion: 'nutrition-policies-v1', snapshotVersion: '1', evaluatedAt: new Date(evaluatedAt),
    payload: {
      evaluationStatus: 'evaluated', targets: calculation().targets, deferredPolicies: [],
      targetProvenance: [targetProvenance], reasons: [],
      contributions: [{ nutrient: 'carbohydrates', amount: carbohydrates, targetValue: '180', currentDailyValue: null, explanation: 'Carbohydrate contribution.' }],
    },
  };
}

describe('Diabetes carbohydrate semantic validation fixtures', () => {
  it('preserves food contribution across portion sizes without treating carbohydrate adequacy as food compatibility', () => {
    const engine = new FoodEvaluationEngine();
    const values = [
      ['small', '50', '15'],
      ['moderate', '100', '30'],
      ['large', '300', '90'],
    ] as const;
    const results = values.map(([, portionGrams]) => engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '0' },
        { name: 'Carbohydrates', unit: 'g', amountPer100Grams: '30' },
      ],
      portionGrams,
      targets: calculation().targets,
      targetCalculation: calculation(),
    }));

    expect(results.map((result) => result.contributions.find(({ nutrient }) => nutrient === 'carbohydrates')?.amount)).toEqual(['15', '30', '90']);
    expect(results.map((result) => result.score)).toEqual([100, 100, 100]);
    expect(results.every((result) => result.evaluationStatus === 'evaluated')).toBe(true);
    expect(results.flatMap(({ reasons }) => reasons.map(({ nutrient }) => nutrient))).not.toContain('carbohydrates');
  });

  it('assesses low, moderate, and high carbohydrate meals through daily adherence', () => {
    const policy = new DiabetesCarbohydrateAdherencePolicy();
    const result = policy.calculate({
      targetCarbohydrateGrams: '180', targetProvenance, targetDeferral: null,
      snapshots: [snapshot('snapshot-breakfast', 'breakfast', '30', '2026-08-22T08:00:00.000Z'), snapshot('snapshot-lunch', 'lunch', '90', '2026-08-22T12:00:00.000Z'), snapshot('snapshot-dinner', 'dinner', '80', '2026-08-22T18:00:00.000Z')],
      expectedMealItemCount: 3,
    });

    expect(result).toMatchObject({ status: 'available', targetCarbohydrateGrams: '180', consumedCarbohydrateGrams: '200', remainingCarbohydrateGrams: '0', exceededByGrams: '20', coveragePercentage: 100 });
    expect(result.snapshotIds).toEqual(['snapshot-breakfast', 'snapshot-dinner', 'snapshot-lunch']);
    expect(result.targetProvenance).toEqual(targetProvenance);
  });

  it('preserves explicit deferral when individualized evidence is unavailable', () => {
    const result = new DiabetesCarbohydrateAdherencePolicy().calculate({
      targetCarbohydrateGrams: null, targetProvenance: null,
      targetDeferral: { policyId: 'diabetes-carbohydrate-target-v1', reason: 'missing-individualized-carbohydrate-target', explanation: 'Approved individualized evidence is missing.' },
      snapshots: [], expectedMealItemCount: 0,
    });

    expect(result).toMatchObject({ status: 'deferred', deferredPolicy: { reason: 'missing-individualized-carbohydrate-target' } });
  });

  it('keeps combined Diabetes and CKD evidence separate', () => {
    const diabetesAndCkd: NutritionTargetCalculation = {
      ...calculation(), targets: { ...calculation().targets, proteinGrams: '60' }, targetProvenance: [
        targetProvenance,
        { target: 'proteinGrams', policyId: 'ckd-non-dialysis-protein-v1', source: 'KDOQI Nutrition in CKD 2020', version: 'v1', explanation: 'Approved CKD protein target.' },
      ],
    };
    const result = new FoodEvaluationEngine().evaluate({
      nutrients: [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '0' }, { name: 'Protein', unit: 'g', amountPer100Grams: '0.73' }, { name: 'Carbohydrates', unit: 'g', amountPer100Grams: '90' }],
      portionGrams: '100', targets: diabetesAndCkd.targets, targetCalculation: diabetesAndCkd,
    });

    expect(result.reasons.map(({ nutrient }) => nutrient)).not.toContain('protein');
    expect(result.reasons.map(({ nutrient }) => nutrient)).not.toContain('carbohydrates');
    expect(result.contributions.map(({ nutrient }) => nutrient)).toEqual(expect.arrayContaining(['protein', 'carbohydrates']));
    expect(result.deferredPolicies).toEqual([]);
  });
});
