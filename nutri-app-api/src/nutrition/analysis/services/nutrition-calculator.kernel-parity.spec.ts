import { Decimal } from 'decimal.js';
import type { NutritionAnalysisItemSource } from '../sources/nutrition-analysis.source.js';
import { NutritionCalculator } from './nutrition-calculator.js';

function legacyCalculate(items: readonly NutritionAnalysisItemSource[]) {
  const totals = new Map<string, { name: string; unit: string; value: Decimal }>();

  for (const item of items) {
    for (const nutrient of item.nutrients) {
      const key = `${nutrient.name.trim().toLowerCase()}|${nutrient.unit.trim().toLowerCase()}`;
      const value = new Decimal(nutrient.amountPer100Grams)
        .mul(item.servingGrams)
        .mul(item.quantity)
        .div(100);
      const existing = totals.get(key);
      totals.set(key, {
        name: existing?.name ?? nutrient.name,
        unit: existing?.unit ?? nutrient.unit,
        value: existing ? existing.value.plus(value) : value,
      });
    }
  }

  return [...totals.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((total) => ({ name: total.name, unit: total.unit, amount: total.value.toString() }));
}

describe('NutritionCalculator kernel migration parity', () => {
  it('matches the legacy calculation contract for precision, aliases, units, and ordering', () => {
    const items: NutritionAnalysisItemSource[] = [
      {
        quantity: '3',
        servingGrams: '33.333',
        nutrients: [
          { name: 'Protein', unit: 'g', amountPer100Grams: '0.333333' },
          { name: 'Sodium, Na', unit: 'MG', amountPer100Grams: '0.1' },
          { name: 'Zinc', unit: 'mg', amountPer100Grams: '0.2' },
        ],
      },
      {
        quantity: '0.25',
        servingGrams: '80',
        nutrients: [
          { name: 'protein', unit: 'g', amountPer100Grams: '10.25' },
          { name: ' sodium ', unit: 'mg', amountPer100Grams: '0.2' },
          { name: 'Zinc', unit: 'MG', amountPer100Grams: '0.3' },
        ],
      },
    ];

    expect(new NutritionCalculator().calculate(items)).toEqual(legacyCalculate(items));
  });

  it('matches the legacy empty-input behavior', () => {
    expect(new NutritionCalculator().calculate([])).toEqual(legacyCalculate([]));
  });
});
