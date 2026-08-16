import { MealItemServing } from '../../repositories/meal.prisma.js';
import { MealItemServingSource } from "../../sources/meal-item-serving.source.js";

export class MealItemServingMapper {
  static toMealItemServing(
    row: MealItemServing,
  ): MealItemServingSource {
    return {
      id: row.id,
      name: row.name,
      grams: row.grams.toString(),
    }
  }
}
