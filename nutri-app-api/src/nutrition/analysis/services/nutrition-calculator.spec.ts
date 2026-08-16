import { NutritionCalculator } from './nutrition-calculator.js';

describe('NutritionCalculator', () => {
  const calculator = new NutritionCalculator();

  it('calculates quantity and serving grams using per-100-gram nutrients', () => {
    expect(calculator.calculate([{
      quantity: '1.5',
      servingGrams: '200',
      nutrients: [{ name: 'Protein', unit: 'g', amountPer100Grams: '10.25' }],
    }])).toEqual([{ name: 'Protein', unit: 'g', amount: '30.75' }]);
  });

  it('aggregates nutrients across multiple items and meals', () => {
    expect(calculator.calculate([
      { quantity: '1', servingGrams: '100', nutrients: [
        { name: 'Calories', unit: 'kcal', amountPer100Grams: '120' },
        { name: 'Protein', unit: 'g', amountPer100Grams: '5' },
      ] },
      { quantity: '2', servingGrams: '50.5', nutrients: [
        { name: 'Calories', unit: 'kcal', amountPer100Grams: '80' },
        { name: 'Protein', unit: 'g', amountPer100Grams: '3.25' },
      ] },
    ])).toEqual([
      { name: 'Calories', unit: 'kcal', amount: '200.8' },
      { name: 'Protein', unit: 'g', amount: '8.2825' },
    ]);
  });

  it('returns no totals for an empty day', () => {
    expect(calculator.calculate([])).toEqual([]);
  });
});
