import { FoodEvaluationValidation } from './food-evaluation-validation.js';

describe('FoodEvaluationValidation', () => {
  it('passes a low-sodium food and records protein separately', () => {
    const result = new FoodEvaluationValidation().evaluate({
      id: 'apple-100g',
      food: 'Approved USDA apple fixture',
      portionGrams: '100',
      nutrients: [
        { name: 'Sodium, Na', unit: 'mg', amountPer100Grams: '2' },
        { name: 'Protein', unit: 'g', amountPer100Grams: '0.3' },
      ],
      targets: { sodiumMilligrams: '2300', proteinGrams: '64' },
      expected: { compatibility: 'pass', userIntuitive: 'yes', explanationSufficient: 'yes' },
    });

    expect(result.expectedCompatibility).toBe('pass');
    expect(result.technicalResult).toBe('pass');
    expect(result.proteinContribution).toContain('0.3 g');
  });

  it('flags missing sodium as needing review instead of assuming compatibility', () => {
    const result = new FoodEvaluationValidation().evaluate({
      id: 'unknown-sodium',
      food: 'Approved USDA incomplete fixture',
      portionGrams: '100',
      nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '10' }],
      targets: { sodiumMilligrams: '2300', proteinGrams: '64' },
    });

    expect(result.expectedCompatibility).toBe('needs-review');
    expect(result.reviewCategory).toBe('nutrient-identification');
  });
});
