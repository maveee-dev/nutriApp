import {
  MealAnalysisRow,
} from '../../repositories/nutrition-analysis.prisma.js';
import {
  NutritionAnalysisItemSource,
  NutritionAnalysisMealSource,
} from '../../sources/nutrition-analysis.source.js';

export class NutritionAnalysisRepositoryMapper {
  static toMealSource(row: MealAnalysisRow): NutritionAnalysisMealSource {
    return {
      id: row.id,
      consumedAt: row.consumedAt,
      items: row.items.map(
        (item): NutritionAnalysisItemSource => ({
          id: item.id,
          quantity: item.quantity.toString(),
          servingGrams: item.serving.grams.toString(),
          nutrients: item.serving.food.nutrients.map((foodNutrient) => ({
            name: foodNutrient.nutrient.name,
            unit: foodNutrient.nutrient.unit,
            amountPer100Grams: foodNutrient.amount.toString(),
          })),
        }),
      ),
    };
  }
}
