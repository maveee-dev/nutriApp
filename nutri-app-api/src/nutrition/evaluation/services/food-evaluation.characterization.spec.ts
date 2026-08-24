import { FoodEvaluationEngine } from './food-evaluation.engine.js';
import {
  CHARACTERIZATION_TARGET_CALCULATION,
  characterizationEvaluationNutrients,
} from '../../testing/fixtures/calculation-characterization.fixtures.js';

describe('FoodEvaluationEngine characterization', () => {
  const engine = new FoodEvaluationEngine();

  it('captures the current contribution contract for every supported evaluated nutrient', () => {
    const result = engine.evaluate({
      nutrients: characterizationEvaluationNutrients(),
      portionGrams: '100',
      targets: CHARACTERIZATION_TARGET_CALCULATION.targets,
      targetCalculation: CHARACTERIZATION_TARGET_CALCULATION,
    });

    expect(result.evaluationStatus).toBe('evaluated');
    expect(result.coverage).toBe(100);
    expect(result.contributions).toEqual([
      expect.objectContaining({ nutrient: 'protein', unit: 'g', amount: '10', targetValue: '64' }),
      expect.objectContaining({ nutrient: 'potassium', unit: 'mg', amount: '250', targetValue: '2000' }),
      expect.objectContaining({ nutrient: 'phosphorus', unit: 'mg', amount: '100', targetValue: '800' }),
      expect.objectContaining({ nutrient: 'calories', unit: 'kcal', amount: '100', targetValue: '2000' }),
      expect.objectContaining({ nutrient: 'fiber', unit: 'g', amount: '3', targetValue: '28' }),
      expect.objectContaining({ nutrient: 'carbohydrates', unit: 'g', amount: '20', targetValue: '180' }),
      expect.objectContaining({ nutrient: 'saturated-fat', unit: 'g', amount: '1.2', targetValue: '20' }),
      expect.objectContaining({ nutrient: 'added-sugar', unit: 'g', amount: '2', targetValue: '50' }),
      expect.objectContaining({ nutrient: 'cholesterol', unit: 'mg', amount: '40', targetValue: '300' }),
    ]);
    expect(result.reasons.map(({ nutrient, measuredValue }) => ({ nutrient, measuredValue }))).toEqual([
      { nutrient: 'sodium', measuredValue: '120' },
      { nutrient: 'potassium', measuredValue: '250' },
      { nutrient: 'phosphorus', measuredValue: '100' },
      { nutrient: 'saturated-fat', measuredValue: '1.2' },
      { nutrient: 'added-sugar', measuredValue: '2' },
      { nutrient: 'cholesterol', measuredValue: '40' },
    ]);
  });

  it('captures current portion scaling for compatibility and contribution outputs', () => {
    const result = engine.evaluate({
      nutrients: characterizationEvaluationNutrients(),
      portionGrams: '250',
      targets: CHARACTERIZATION_TARGET_CALCULATION.targets,
      targetCalculation: CHARACTERIZATION_TARGET_CALCULATION,
    });

    expect(result.reasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ nutrient: 'sodium', measuredValue: '300' }),
      expect.objectContaining({ nutrient: 'potassium', measuredValue: '625' }),
      expect.objectContaining({ nutrient: 'phosphorus', measuredValue: '250' }),
    ]));
    expect(result.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ nutrient: 'protein', amount: '25' }),
      expect.objectContaining({ nutrient: 'carbohydrates', amount: '50' }),
      expect.objectContaining({ nutrient: 'calories', amount: '250' }),
    ]));
  });

  it('preserves zero score-bearing values as evaluated evidence', () => {
    const result = engine.evaluate({
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '0' },
        { name: 'Fatty acids, total saturated', unit: 'g', amountPer100Grams: '0' },
        { name: 'Cholesterol', unit: 'mg', amountPer100Grams: '0' },
      ],
      portionGrams: '100',
      targets: {
        sodiumMilligrams: '2300',
        proteinGrams: null,
        saturatedFatGrams: '20',
        cholesterolMilligrams: '300',
      },
      targetCalculation: {
        targets: {
          sodiumMilligrams: '2300',
          proteinGrams: null,
          saturatedFatGrams: '20',
          cholesterolMilligrams: '300',
        },
        adjustments: [],
        deferredPolicies: [],
      },
    });

    expect(result).toMatchObject({ evaluationStatus: 'evaluated', score: 100, coverage: 100 });
  });

  it('captures the current insufficient-evidence contract for foods without score-bearing nutrients', () => {
    const result = engine.evaluate({
      nutrients: [
        { name: 'Calcium', unit: 'mg', amountPer100Grams: '60' },
        { name: 'Iron', unit: 'mg', amountPer100Grams: '2' },
      ],
      portionGrams: '100',
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      targetCalculation: { targets: { sodiumMilligrams: '2300', proteinGrams: null }, adjustments: [], deferredPolicies: [] },
    });

    expect(result).toEqual({
      score: 0,
      evaluationStatus: 'insufficient-evidence',
      coverage: 0,
      reasons: [],
      contributions: [],
      deferredPolicies: [],
    });
  });
});
