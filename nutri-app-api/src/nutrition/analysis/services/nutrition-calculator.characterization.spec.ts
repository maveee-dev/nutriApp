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

  it('returns an empty total for an empty daily intake', () => {
    expect(calculator.calculate([])).toEqual([]);
  });
});
