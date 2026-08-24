import { CanonicalCalculationKernel } from '../../calculation/index.js';
import { NutritionAnalysisItemSource } from '../sources/nutrition-analysis.source.js';
import { NutritionTotal } from '../types/nutrition-total.type.js';

export class NutritionCalculator {
  private readonly calculationKernel = new CanonicalCalculationKernel();

  calculate(items: readonly NutritionAnalysisItemSource[]): NutritionTotal[] {
    const result = this.calculationKernel.calculateComposition({
      items: items.map((item) => ({
        servingGrams: item.servingGrams,
        quantity: item.quantity,
        nutrients: item.nutrients.map((nutrient) => ({
          nutrientKey: nutrient.name.trim().toLowerCase(),
          name: nutrient.name,
          unit: nutrient.unit,
          amountPer100Grams: nutrient.amountPer100Grams,
        })),
      })),
      aggregationOrder: 'input',
    });

    return [...result.contributions]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((contribution) => ({
        name: contribution.name,
        unit: contribution.unit,
        amount: contribution.amount,
      }));
  }
}
