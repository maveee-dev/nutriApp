import { NutritionCalculator } from './nutrition-calculator.js';
import {
  CHARACTERIZATION_NUTRIENTS,
  characterizationItem,
  expectedCharacterizationTotals,
} from '../../testing/fixtures/calculation-characterization.fixtures.js';

describe('NutritionCalculator characterization', () => {
  const calculator = new NutritionCalculator();

  it('captures all currently represented nutrient contributions for a household-sized portion', () => {
    const result = calculator.calculate([characterizationItem('1.25', '80')]);

    expect(result).toEqual(expectedCharacterizationTotals('1'));
    expect(result).toHaveLength(CHARACTERIZATION_NUTRIENTS.length);
  });

  it('captures fractional, duplicate, and mixed serving aggregation', () => {
    const result = calculator.calculate([
      characterizationItem('0.5', '200'),
      characterizationItem('2', '50'),
    ]);

    expect(result).toEqual(expectedCharacterizationTotals('2'));
  });

  it('preserves Decimal accumulation without intermediate rounding', () => {
    const result = calculator.calculate([
      {
        quantity: '3',
        servingGrams: '33.333',
        nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '0.333333' }],
      },
      {
        quantity: '0.25',
        servingGrams: '80',
        nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '10.25' }],
      },
    ]);

    expect(result).toEqual([{
      name: 'Protein',
      unit: 'g',
      amount: '2.38332966667',
    }]);
  });

  it('keeps explicit zero values while omitting absent nutrients', () => {
    const result = calculator.calculate([{
      quantity: '1',
      servingGrams: '100',
      nutrients: [
        { name: 'Sodium', unit: 'mg', amountPer100Grams: '0' },
        { name: 'Protein', unit: 'g', amountPer100Grams: '10' },
      ],
    }]);

    expect(result).toEqual([
      { name: 'Protein', unit: 'g', amount: '10' },
      { name: 'Sodium', unit: 'mg', amount: '0' },
    ]);
    expect(result.some(({ name }) => name === 'Potassium')).toBe(false);
  });

  it('uses one authoritative value when USDA publishes alternative carbohydrate rows', () => {
    const result = calculator.calculate([{
      quantity: '1',
      servingGrams: '100',
      nutrients: [
        { sourceId: '1005', name: 'Carbohydrate, by difference', unit: 'g', amountPer100Grams: '10' },
        { sourceId: '1050', name: 'Carbohydrate, by summation', unit: 'g', amountPer100Grams: '12' },
      ],
    }]);

    expect(result).toEqual([
      { name: 'Carbohydrate, by difference', unit: 'g', amount: '10' },
    ]);
  });

  it('uses total dietary fiber instead of adding total and component rows', () => {
    const result = calculator.calculate([{
      quantity: '1',
      servingGrams: '100',
      nutrients: [
        { sourceId: '1079', name: 'Fiber, total dietary', unit: 'g', amountPer100Grams: '3' },
        { sourceId: '1082', name: 'Fiber, soluble', unit: 'g', amountPer100Grams: '1' },
        { sourceId: '1084', name: 'Fiber, insoluble', unit: 'g', amountPer100Grams: '2' },
      ],
    }]);

    expect(result).toEqual([
      { name: 'Fiber, total dietary', unit: 'g', amount: '3' },
    ]);
  });

  it('aggregates equivalent carbohydrate representations across foods under one key', () => {
    const result = calculator.calculate([
      {
        quantity: '1',
        servingGrams: '100',
        nutrients: [{ sourceId: '1005', name: 'Carbohydrate, by difference', unit: 'g', amountPer100Grams: '10' }],
      },
      {
        quantity: '1',
        servingGrams: '100',
        nutrients: [{ name: 'Carbohydrates', unit: 'g', amountPer100Grams: '5' }],
      },
    ]);

    expect(result).toEqual([
      { name: 'Carbohydrate, by difference', unit: 'g', amount: '15' },
    ]);
  });

  it('returns an empty total for an empty daily intake', () => {
    expect(calculator.calculate([])).toEqual([]);
  });
});
