import { MealItemFood } from '../../repositories/meal.prisma.js';
import { MealItemFoodSource } from "../../sources/meal-item-food.source.js";
import { resolveFoodPresentation } from '../../../nutrition/foods/services/food-presentation.service.js';

export class MealItemFoodMapper {
  static toMealItemFoodSource(
    row: MealItemFood,
  ): MealItemFoodSource {
    return {
      id: row.id,
      name: row.name,
      ...(() => {
        const presentation = resolveFoodPresentation(row.name, row.presentation == null ? null : {
          displayNameOverride: row.presentation.displayNameOverride,
          variantLabelOverride: row.presentation.variantLabelOverride,
          searchPriority: row.presentation.searchPriority,
          aliases: row.presentation.aliases,
        });
        return { displayName: presentation.displayName, variantLabel: presentation.variantLabel };
      })(),
    };
  }
}
