import { MealItemFood } from '../../repositories/meal.prisma.js';
import { MealItemFoodSource } from "../../sources/meal-item-food.source.js";

export class MealItemFoodMapper {
  static toMealItemFoodSource(
    row: MealItemFood,
  ): MealItemFoodSource {
    return {
      id: row.id,
      name: row.name,
    };
  }
}
