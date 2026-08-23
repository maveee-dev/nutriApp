import { MealItemServing } from '../../repositories/meal.prisma.js';
import { MealItemServingSource } from "../../sources/meal-item-serving.source.js";
import { normalizeServingDisplayName, resolveFoodPresentation } from '../../../nutrition/foods/services/food-presentation.service.js';

export class MealItemServingMapper {
  static toMealItemServing(
    row: MealItemServing,
  ): MealItemServingSource {
    const foodPresentation = resolveFoodPresentation(row.food.name, row.food.presentation == null ? null : {
      displayNameOverride: row.food.presentation.displayNameOverride,
      variantLabelOverride: row.food.presentation.variantLabelOverride,
      searchPriority: row.food.presentation.searchPriority,
      aliases: row.food.presentation.aliases,
    });
    return {
      id: row.id,
      name: normalizeServingDisplayName(row.name, foodPresentation.displayName),
      grams: row.grams.toString(),
    }
  }
}
