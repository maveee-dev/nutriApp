import { Decimal } from 'decimal.js';
import { NutritionAnalysisItemSource } from '../sources/nutrition-analysis.source.js';
import { NutritionTotal } from '../types/nutrition-total.type.js';

export class NutritionCalculator {
  calculate(items: readonly NutritionAnalysisItemSource[]): NutritionTotal[] {
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
      .map((total) => ({
        name: total.name,
        unit: total.unit,
        amount: total.value.toString(),
      }));
  }
}
