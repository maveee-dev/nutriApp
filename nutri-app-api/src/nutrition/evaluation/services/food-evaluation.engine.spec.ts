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

    expect(result.score).toBe(91);
    expect(result.coverage).toBe(100);
    expect(result.reasons.map(({ code }) => code)).toEqual([
      'sodium-contribution',
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

    expect(result.score).toBe(0);
    expect(result.coverage).toBe(100);
    expect(result.reasons[0]).toMatchObject({
      code: 'sodium-above-target',
      direction: 'negative',
      measuredValue: '3000',
      targetValue: '2300',
    });
    expect(result.contributions).toContainEqual(expect.objectContaining({
      nutrient: 'sodium',
      unit: 'mg',
      amount: '3000',
      targetValue: '2300',
    }));
    expect(result.deferredPolicies).toEqual(deferred);
  });

  it('recognizes USDA nutrient names with analyte suffixes', () => {
    const targetCalculation = calculation();
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium, Na', unit: 'mg', amountPer100Grams: '1500' },
        { name: 'Protein', unit: 'g', amountPer100Grams: '10' },
      ],
      portionGrams: '200',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.reasons.map(({ code }) => code)).toEqual([
      'sodium-above-target',
    ]);
    expect(result.score).toBe(0);
    expect(result.coverage).toBe(100);
  });

  it('does not invent a protein penalty when the target is unavailable', () => {
    const targetCalculation = calculation(null);
    const result = engine.evaluate({
      nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '5' }],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(0);
    expect(result.evaluationStatus).toBe('insufficient-evidence');
    expect(result.coverage).toBe(0);
    expect(result.reasons).toEqual([]);
    expect(result.contributions).toHaveLength(1);
  });

  it('preserves zero-valued score-bearing nutrients as evaluated evidence', () => {
    const targetCalculation = calculation(null);
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium, Na', unit: 'mg', amountPer100Grams: '0' },
        { name: 'Fatty acids, total saturated', unit: 'g', amountPer100Grams: '0' },
        { name: 'Cholesterol', unit: 'mg', amountPer100Grams: '0' },
      ],
      portionGrams: '118',
      targets: { ...targetCalculation.targets, saturatedFatGrams: '20', cholesterolMilligrams: '300' },
      targetCalculation: { ...targetCalculation, targets: { ...targetCalculation.targets, saturatedFatGrams: '20', cholesterolMilligrams: '300' } },
    });

    expect(result.evaluationStatus).toBe('evaluated');
    expect(result.score).toBe(100);
    expect(result.coverage).toBe(100);
  });

  it('reports protein as a daily contribution without penalizing standalone compatibility', () => {
    const targetCalculation = calculation();
    const result = engine.evaluate({
      nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '10' }],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(0);
    expect(result.contributions).toEqual([{
      nutrient: 'protein',
      unit: 'g',
      amount: '10',
      targetValue: '60',
      currentDailyValue: null,
      explanation: 'This portion provides 10 g of protein toward the current daily target of 60 g.',
    }]);
  });

  it('does not penalize a low-protein food when CKD lower-target evidence is active', () => {
    const targetCalculation = {
      ...calculation(),
      targetProvenance: [{
        target: 'proteinGrams' as const,
        policyId: 'ckd-non-dialysis-protein-v1',
        source: 'KDOQI',
        version: 'v1',
        explanation: 'Approved CKD protein target.',
      }],
    };
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '0' },
        { name: 'Protein', unit: 'g', amountPer100Grams: '0.73' },
      ],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(100);
    expect(result.coverage).toBe(100);
    expect(result.reasons.map(({ nutrient }) => nutrient)).toEqual(['sodium']);
    expect(result.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ nutrient: 'protein', amount: '0.73', targetValue: '60' }),
    ]));
  });

  it('explains when the daily protein target was already met', () => {
    const targetCalculation = calculation();
    const result = engine.evaluate({
      nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '10' }],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
      currentDailyTotals: [{ name: 'Protein', unit: 'g', amount: '65' }],
    });

    expect(result.contributions[0]?.explanation).toBe(
      "This portion provides 10 g of additional protein. Today's protein target of 60 g has already been met.",
    );
    expect(result.contributions[0]?.currentDailyValue).toBe('65');
  });

  it('reports potassium as a contribution when no potassium policy applies', () => {
    const targetCalculation = calculation();
    const result = engine.evaluate({
      nutrients: [{ name: 'Potassium, K', unit: 'mg', amountPer100Grams: '358' }],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(0);
    expect(result.coverage).toBe(0);
    expect(result.reasons).toEqual([]);
    expect(result.contributions).toContainEqual({
      nutrient: 'potassium',
      unit: 'mg',
      amount: '358',
      targetValue: null,
      currentDailyValue: null,
      explanation: 'This portion provides 358 mg of potassium. No applicable potassium policy is currently available.',
    });
  });

  it('keeps an informational potassium deferral outside compatibility scoring', () => {
    const deferred = [{
      policyId: 'ckd-potassium-v1',
      reason: 'missing-individualized-potassium-target',
      explanation: 'Potassium was not included in this compatibility score because no individualized potassium limit is currently available.',
    }];
    const nutrients = [
      { name: 'Sodium', unit: 'mg', amountPer100Grams: '100' },
      { name: 'Protein', unit: 'g', amountPer100Grams: '20' },
      { name: 'Potassium, K', unit: 'mg', amountPer100Grams: '358' },
    ];
    const withoutDeferral = calculation();
    const withDeferral = calculation('60', deferred);
    const baseline = engine.evaluate({
      nutrients,
      portionGrams: '200',
      targets: withoutDeferral.targets,
      targetCalculation: withoutDeferral,
    });
    const result = engine.evaluate({
      nutrients,
      portionGrams: '200',
      targets: withDeferral.targets,
      targetCalculation: withDeferral,
    });

    expect(result.score).toBe(baseline.score);
    expect(result.coverage).toBe(baseline.coverage);
    expect(result.reasons).toEqual(baseline.reasons);
    expect(result.contributions).toEqual(baseline.contributions);
    expect(result.deferredPolicies).toEqual(deferred);
  });

  it('adds potassium to compatibility only when a policy supplies a target', () => {
    const targetCalculation = {
      ...calculation(),
      targets: { ...calculation().targets, potassiumMilligrams: '3500' },
    };
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '100' },
        { name: 'Protein', unit: 'g', amountPer100Grams: '20' },
        { name: 'Potassium, K', unit: 'mg', amountPer100Grams: '7000' },
      ],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(55);
    expect(result.coverage).toBe(100);
    expect(result.reasons.map(({ code }) => code)).toEqual([
      'sodium-contribution',
      'potassium-above-target',
    ]);
    expect(result.contributions).toContainEqual(expect.objectContaining({ nutrient: 'potassium', amount: '7000', targetValue: '3500' }));
  });

  it('reports calories as a contribution without changing compatibility', () => {
    const targetCalculation = calculation();
    const result = engine.evaluate({
      nutrients: [
        { name: 'Energy', unit: 'kcal', amountPer100Grams: '165' },
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '74' },
      ],
      portionGrams: '200',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(94);
    expect(result.contributions).toContainEqual({
      nutrient: 'calories',
      unit: 'kcal',
      amount: '330',
      targetValue: null,
      currentDailyValue: null,
      explanation: 'This portion provides 330 kcal. A personalized daily energy target is not currently available.',
    });
  });

  it('reports USDA dietary fiber as a contribution without changing compatibility', () => {
    const targetCalculation = calculation();
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '1' },
        { name: 'Fiber, total dietary', unit: 'g', amountPer100Grams: '2.4' },
      ],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(100);
    expect(result.contributions).toContainEqual({
      nutrient: 'fiber',
      unit: 'g',
      amount: '2.4',
      targetValue: null,
      currentDailyValue: null,
      explanation: 'This portion provides 2.4 g of dietary fiber. A personalized daily fiber target is not currently available.',
    });
  });

  it('includes active saturated-fat, added-sugar, and cholesterol upper-limit policies in compatibility', () => {
    const targetCalculation = calculation();
    const targets = {
      ...targetCalculation.targets,
      saturatedFatGrams: '20',
      addedSugarGrams: '50',
      cholesterolMilligrams: '300',
    };
    const result = engine.evaluate({
      nutrients: [
        { name: 'Saturated Fat', unit: 'g', amountPer100Grams: '25' },
        { name: 'Added Sugar', unit: 'g', amountPer100Grams: '60' },
        { name: 'Cholesterol', unit: 'mg', amountPer100Grams: '400' },
      ],
      portionGrams: '100',
      targets,
      targetCalculation: { ...targetCalculation, targets },
    });

    expect(result.score).toBe(0);
    expect(result.reasons.map(({ code }) => code)).toEqual([
      'saturated-fat-above-target',
      'added-sugar-above-target',
      'cholesterol-above-target',
    ]);
    expect(result.coverage).toBe(55.56);
    expect(result.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ nutrient: 'saturated-fat', targetValue: '20' }),
      expect.objectContaining({ nutrient: 'added-sugar', targetValue: '50' }),
      expect.objectContaining({ nutrient: 'cholesterol', targetValue: '300' }),
    ]));
  });

  it('reports USDA total carbohydrates as a contribution without changing compatibility', () => {
    const targetCalculation = calculation();
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '1' },
        { name: 'Carbohydrate, by difference', unit: 'g', amountPer100Grams: '13.81' },
      ],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(100);
    expect(result.contributions).toContainEqual({
      nutrient: 'carbohydrates',
      unit: 'g',
      amount: '13.81',
      targetValue: null,
      currentDailyValue: null,
      explanation: 'This portion provides 13.81 g of total carbohydrates. A personalized daily carbohydrate target is not currently available.',
    });
  });

  it('consumes an approved carbohydrate target without recalculating the contribution', () => {
    const targetCalculation = {
      ...calculation(),
      targets: { sodiumMilligrams: '2300', proteinGrams: '60', carbohydrateGrams: '180' },
    };
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '1' },
        { name: 'Carbohydrates', unit: 'g', amountPer100Grams: '13.81' },
      ],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.contributions).toContainEqual({
      nutrient: 'carbohydrates',
      unit: 'g',
      amount: '13.81',
      targetValue: '180',
      currentDailyValue: null,
      explanation: 'This portion provides 13.81 g of total carbohydrates toward the approved daily target of 180 g.',
    });
  });

  it('does not treat an individualized carbohydrate target as standalone food compatibility', () => {
    const targetCalculation = {
      ...calculation(),
      targets: { sodiumMilligrams: '2300', proteinGrams: null, carbohydrateGrams: '180' },
      targetProvenance: [{
        target: 'carbohydrateGrams' as const,
        policyId: 'diabetes-carbohydrate-target-v1',
        source: 'ADA Standards of Care in Diabetes—2026',
        version: 'v1',
        explanation: 'Approved individualized carbohydrate target.',
      }],
    };
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '1' },
        { name: 'Carbohydrates', unit: 'g', amountPer100Grams: '200' },
      ],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result).toMatchObject({ evaluationStatus: 'evaluated', score: 100, coverage: 100 });
    expect(result.reasons.map(({ nutrient }) => nutrient)).not.toContain('carbohydrates');
    expect(result.contributions).toContainEqual(expect.objectContaining({ nutrient: 'carbohydrates', amount: '200', targetValue: '180' }));
  });

  it('reports USDA saturated fat as a contribution without changing compatibility', () => {
    const targetCalculation = calculation();
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '1' },
        { name: 'Fatty acids, total saturated', unit: 'g', amountPer100Grams: '3.24' },
      ],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(100);
    expect(result.contributions).toContainEqual({
      nutrient: 'saturated-fat',
      unit: 'g',
      amount: '3.24',
      targetValue: null,
      currentDailyValue: null,
      explanation: 'This portion provides 3.24 g of saturated fat. An approved personalized saturated-fat target is not currently available.',
    });
  });

  it('reports USDA added sugar as a contribution without changing compatibility', () => {
    const targetCalculation = calculation();
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '1' },
        { name: 'Sugars, added', unit: 'g', amountPer100Grams: '5' },
      ],
      portionGrams: '200',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(100);
    expect(result.contributions).toContainEqual({
      nutrient: 'added-sugar',
      unit: 'g',
      amount: '10',
      targetValue: null,
      currentDailyValue: null,
      explanation: 'This portion provides 10 g of added sugar. An approved personalized added-sugar target is not currently available.',
    });
  });

  it('reports cholesterol as a contribution without changing compatibility', () => {
    const targetCalculation = calculation();
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '1' },
        { name: 'Cholesterol', unit: 'mg', amountPer100Grams: '85' },
      ],
      portionGrams: '200',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(100);
    expect(result.contributions).toContainEqual({
      nutrient: 'cholesterol',
      unit: 'mg',
      amount: '170',
      targetValue: null,
      currentDailyValue: null,
      explanation: 'This portion provides 170 mg of cholesterol. An approved personalized cholesterol target is not currently available.',
    });
  });

  it('does not reduce current compatibility for cholesterol without an active cholesterol policy', () => {
    const targetCalculation = calculation();
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '1' },
        { name: 'Cholesterol', unit: 'mg', amountPer100Grams: '400' },
      ],
      portionGrams: '100',
      targets: targetCalculation.targets,
      targetCalculation,
    });

    expect(result.score).toBe(100);
    expect(result.reasons.map(({ nutrient }) => nutrient)).toEqual(['sodium']);
    expect(result.contributions).toContainEqual(expect.objectContaining({
      nutrient: 'cholesterol',
      amount: '400',
      targetValue: null,
    }));
  });
});
