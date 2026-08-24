import { CanonicalCalculationKernel } from './canonical-calculation-kernel.js';

describe('CanonicalCalculationKernel', () => {
  const kernel = new CanonicalCalculationKernel();

  it('scales fractional and multiple servings without rounding', () => {
    expect(kernel.servingToGrams({ servingGrams: '80', quantity: '1.25' })).toBe('100');
    expect(kernel.servingToGrams({ servingGrams: '80', quantity: '2.5' })).toBe('200');
    expect(kernel.servingToGrams({ servingGrams: '37.5', quantity: '0.333333' })).toBe('12.4999875');
  });

  it('calculates nutrient contributions from per-100-gram values', () => {
    const result = kernel.calculateNutrients({
      servingGrams: '50',
      quantity: '2',
      nutrients: [
        { nutrientKey: 'protein', name: 'Protein', unit: 'g', amountPer100Grams: '12.5' },
        { nutrientKey: 'sodium', name: 'Sodium', unit: 'mg', amountPer100Grams: '240' },
      ],
    });

    expect(result.contributions).toEqual([
      { nutrientKey: 'protein', name: 'Protein', unit: 'g', amount: '12.5' },
      { nutrientKey: 'sodium', name: 'Sodium', unit: 'mg', amount: '240' },
    ]);
    expect(result.diagnostics).toEqual({ missingNutrientKeys: [], unitConflicts: [] });
  });

  it('preserves zero values and reports missing values separately', () => {
    const result = kernel.calculateNutrients({
      servingGrams: '100',
      nutrients: [
        { nutrientKey: 'sodium', name: 'Sodium', unit: 'mg', amountPer100Grams: '0' },
        { nutrientKey: 'potassium', name: 'Potassium', unit: 'mg', amountPer100Grams: null },
      ],
      expectedNutrientKeys: ['sodium', 'potassium', 'phosphorus'],
    });

    expect(result.contributions).toEqual([
      { nutrientKey: 'sodium', name: 'Sodium', unit: 'mg', amount: '0' },
    ]);
    expect(result.diagnostics.missingNutrientKeys).toEqual(['phosphorus', 'potassium']);
  });

  it('aggregates duplicate nutrients with Decimal arithmetic', () => {
    const result = kernel.aggregateContributions([
      { nutrientKey: 'protein', name: 'Protein', unit: 'g', amount: '0.1' },
      { nutrientKey: 'protein', name: 'Protein', unit: 'g', amount: '0.2' },
      { nutrientKey: 'fiber', name: 'Fiber', unit: 'g', amount: '1.25' },
    ]);

    expect(result.contributions).toEqual([
      { nutrientKey: 'fiber', name: 'Fiber', unit: 'g', amount: '1.25' },
      { nutrientKey: 'protein', name: 'Protein', unit: 'g', amount: '0.3' },
    ]);
  });

  it('does not combine the same nutrient across different units', () => {
    const result = kernel.aggregateContributions([
      { nutrientKey: 'calcium', name: 'Calcium', unit: 'mg', amount: '100' },
      { nutrientKey: 'calcium', name: 'Calcium', unit: 'g', amount: '0.2' },
    ]);

    expect(result.contributions).toEqual([
      { nutrientKey: 'calcium', name: 'Calcium', unit: 'g', amount: '0.2' },
      { nutrientKey: 'calcium', name: 'Calcium', unit: 'mg', amount: '100' },
    ]);
    expect(result.diagnostics.unitConflicts).toEqual([
      { nutrientKey: 'calcium', units: ['g', 'mg'] },
    ]);
  });

  it('calculates and aggregates arbitrary food composition items', () => {
    const result = kernel.calculateComposition({
      items: [
        {
          itemKey: 'egg',
          servingGrams: '50',
          quantity: '1',
          nutrients: [{ nutrientKey: 'protein', name: 'Protein', unit: 'g', amountPer100Grams: '12' }],
        },
        {
          itemKey: 'toast',
          servingGrams: '30',
          quantity: '2',
          nutrients: [{ nutrientKey: 'protein', name: 'Protein', unit: 'g', amountPer100Grams: '10' }],
        },
      ],
    });

    expect(result.contributions).toEqual([
      { nutrientKey: 'protein', name: 'Protein', unit: 'g', amount: '12' },
    ]);
  });

  it('rejects negative or non-finite portion inputs', () => {
    expect(() => kernel.servingToGrams({ servingGrams: '-1' })).toThrow(
      'servingGrams must be a finite, non-negative decimal',
    );
    expect(() => kernel.servingToGrams({ servingGrams: '100', quantity: 'Infinity' })).toThrow(
      'quantity must be a finite, non-negative decimal',
    );
  });
});
