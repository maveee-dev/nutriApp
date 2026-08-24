import { FoodEvaluationEngine } from './food-evaluation.engine.js';
import {
  CHARACTERIZATION_TARGET_CALCULATION,
  characterizationEvaluationNutrients,
} from '../../testing/fixtures/calculation-characterization.fixtures.js';
import { FoodEvaluationInput } from '../types/food-evaluation.type.js';

describe('FoodEvaluationEngine kernel migration parity', () => {
  const engine = new FoodEvaluationEngine();

  it.each([
    {
      name: 'all supported nutrients at one hundred grams',
      input: {
        nutrients: characterizationEvaluationNutrients(),
        portionGrams: '100',
        targets: CHARACTERIZATION_TARGET_CALCULATION.targets,
        targetCalculation: CHARACTERIZATION_TARGET_CALCULATION,
      },
    },
    {
      name: 'all supported nutrients at a fractional-scaled portion',
      input: {
        nutrients: characterizationEvaluationNutrients(),
        portionGrams: '237.5',
        targets: CHARACTERIZATION_TARGET_CALCULATION.targets,
        targetCalculation: CHARACTERIZATION_TARGET_CALCULATION,
        currentDailyTotals: [
          { name: 'Protein', unit: 'g', amount: '12.125' },
        ],
      },
    },
    {
      name: 'zero-valued score-bearing nutrients',
      input: {
        nutrients: [
          { name: 'Sodium, Na', unit: 'mg', amountPer100Grams: '0' },
          { name: 'Fatty acids, total saturated', unit: 'g', amountPer100Grams: '0' },
          { name: 'Cholesterol', unit: 'mg', amountPer100Grams: '0' },
        ],
        portionGrams: '118',
        targets: { ...CHARACTERIZATION_TARGET_CALCULATION.targets, saturatedFatGrams: '20', cholesterolMilligrams: '300' },
        targetCalculation: {
          ...CHARACTERIZATION_TARGET_CALCULATION,
          targets: { ...CHARACTERIZATION_TARGET_CALCULATION.targets, saturatedFatGrams: '20', cholesterolMilligrams: '300' },
        },
      },
    },
    {
      name: 'missing score-bearing nutrients',
      input: {
        nutrients: [
          { name: 'Calcium', unit: 'mg', amountPer100Grams: '60' },
          { name: 'Iron', unit: 'mg', amountPer100Grams: '2' },
        ],
        portionGrams: '100',
        targets: { sodiumMilligrams: '2300', proteinGrams: null },
        targetCalculation: { targets: { sodiumMilligrams: '2300', proteinGrams: null }, adjustments: [], deferredPolicies: [] },
      },
    },
    {
      name: 'duplicate nutrient aliases and unit formatting',
      input: {
        nutrients: [
          { name: 'Sodium, Na', unit: 'MG', amountPer100Grams: '0.1' },
          { name: ' sodium ', unit: 'mg', amountPer100Grams: '0.2' },
          { name: 'Protein', unit: 'g', amountPer100Grams: '0.333333' },
        ],
        portionGrams: '37.5',
        targets: { sodiumMilligrams: '2300', proteinGrams: '60' },
        targetCalculation: { targets: { sodiumMilligrams: '2300', proteinGrams: '60' }, adjustments: [], deferredPolicies: [] },
      },
    },
  ] satisfies readonly { name: string; input: FoodEvaluationInput }[])('$name', ({ input }) => {
    expect(engine.evaluateWithKernel(input)).toEqual(engine.evaluate(input));
  });
});
