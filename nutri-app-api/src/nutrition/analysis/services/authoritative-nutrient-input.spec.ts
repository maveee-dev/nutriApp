import { authoritativeNutrientKey, selectAuthoritativeNutrientInputs } from './authoritative-nutrient-input.js';

describe('selectAuthoritativeNutrientInputs', () => {
  it('prefers USDA carbohydrate by difference over by summation', () => {
    const result = selectAuthoritativeNutrientInputs([
      { sourceId: '1050', name: 'Carbohydrate, by summation', unit: 'g', amountPer100Grams: '12' },
      { sourceId: '1005', name: 'Carbohydrate, by difference', unit: 'g', amountPer100Grams: '10' },
    ]);

    expect(result).toEqual([
      { sourceId: '1005', name: 'Carbohydrate, by difference', unit: 'g', amountPer100Grams: '10' },
    ]);
  });

  it('uses name precedence when source IDs are unavailable', () => {
    const result = selectAuthoritativeNutrientInputs([
      { name: 'Carbohydrate, by summation', unit: 'g', amountPer100Grams: '12' },
      { name: 'Carbohydrate, by difference', unit: 'g', amountPer100Grams: '10' },
    ]);

    expect(result).toEqual([
      { name: 'Carbohydrate, by difference', unit: 'g', amountPer100Grams: '10' },
    ]);
  });

  it('prefers total dietary fiber and avoids adding its components', () => {
    const result = selectAuthoritativeNutrientInputs([
      { sourceId: '1082', name: 'Fiber, soluble', unit: 'g', amountPer100Grams: '1' },
      { sourceId: '1084', name: 'Fiber, insoluble', unit: 'g', amountPer100Grams: '2' },
      { sourceId: '1079', name: 'Fiber, total dietary', unit: 'g', amountPer100Grams: '3.5' },
    ]);

    expect(result).toEqual([
      { sourceId: '1079', name: 'Fiber, total dietary', unit: 'g', amountPer100Grams: '3.5' },
    ]);
  });

  it('keeps soluble and insoluble components when no total is available', () => {
    const result = selectAuthoritativeNutrientInputs([
      { sourceId: '1082', name: 'Fiber, soluble', unit: 'g', amountPer100Grams: '1' },
      { sourceId: '1084', name: 'Fiber, insoluble', unit: 'g', amountPer100Grams: '2' },
    ]);

    expect(result).toHaveLength(2);
  });

  it('prefers kcal over kJ without silently converting or summing both', () => {
    const result = selectAuthoritativeNutrientInputs([
      { sourceId: '1062', name: 'Energy', unit: 'kJ', amountPer100Grams: '500' },
      { sourceId: '1008', name: 'Energy', unit: 'kcal', amountPer100Grams: '120' },
    ]);

    expect(result).toEqual([
      { sourceId: '1008', name: 'Energy', unit: 'kcal', amountPer100Grams: '120' },
    ]);
  });

  it('uses unit precedence when energy source IDs are unavailable', () => {
    const result = selectAuthoritativeNutrientInputs([
      { name: 'Energy', unit: 'kJ', amountPer100Grams: '500' },
      { name: 'Energy', unit: 'kcal', amountPer100Grams: '120' },
    ]);

    expect(result).toEqual([
      { name: 'Energy', unit: 'kcal', amountPer100Grams: '120' },
    ]);
  });

  it('does not deduplicate unrelated nutrients or reported zero values', () => {
    const nutrients = [
      { name: 'Protein', unit: 'g', amountPer100Grams: '0' },
      { name: 'Calcium, Ca', unit: 'mg', amountPer100Grams: '60' },
    ];

    expect(selectAuthoritativeNutrientInputs(nutrients)).toEqual(nutrients);
  });

  it('uses a shared aggregation key for equivalent rows across different foods', () => {
    expect(authoritativeNutrientKey({ name: 'Carbohydrate, by difference', unit: 'g', amountPer100Grams: '10' })).toBe('carbohydrates');
    expect(authoritativeNutrientKey({ name: 'Carbohydrates', unit: 'g', amountPer100Grams: '12' })).toBe('carbohydrates');
    expect(authoritativeNutrientKey({ name: 'Protein', unit: 'g', amountPer100Grams: '10' })).toBe('protein');
  });
});
