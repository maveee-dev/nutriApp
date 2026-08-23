import { FoodEvaluationEngine } from './food-evaluation.engine.js';

describe('FoodEvaluationEngine phosphorus semantics', () => {
  const engine = new FoodEvaluationEngine();
  const base = { targets: { sodiumMilligrams: '2300', proteinGrams: null }, adjustments: [], deferredPolicies: [] };

  it('keeps phosphorus visible as contribution without an active policy', () => {
    const result = engine.evaluate({
      nutrients: [{ name: 'Phosphorus, P', unit: 'mg', amountPer100Grams: '180' }],
      portionGrams: '100', targets: base.targets, targetCalculation: base,
    });

    expect(result.reasons).toEqual([]);
    expect(result.evaluationStatus).toBe('insufficient-evidence');
    expect(result.contributions).toContainEqual(expect.objectContaining({ nutrient: 'phosphorus', amount: '180', targetValue: null }));
  });

  it('evaluates phosphorus compatibility and preserves the same contribution', () => {
    const targetCalculation = { ...base, targets: { ...base.targets, phosphorusMilligrams: '800' } };
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '100' },
        { name: 'Phosphorus', unit: 'mg', amountPer100Grams: '1000' },
      ],
      portionGrams: '100', targets: targetCalculation.targets, targetCalculation,
    });

    expect(result.reasons).toContainEqual(expect.objectContaining({ code: 'phosphorus-above-target', direction: 'negative' }));
    expect(result.contributions).toContainEqual(expect.objectContaining({ nutrient: 'phosphorus', amount: '1000', targetValue: '800' }));
    expect(result.evaluationStatus).toBe('evaluated');
  });
});
