import { MealDetail, MealItem, MealSummary } from '../../repositories/meal.prisma.js';
import { MealDetailSource } from "../../sources/meal-detail.source.js";
import { MealSummarySource } from "../../sources/meal-summary.source.js";
import { MealItemSource } from "../../sources/meal-item.source.js";
import { MealItemFoodMapper } from "./meal-item-food.mapper.js";
import { MealItemServingMapper } from "./meal-item-serving.mapper.js";

export class MealRepositoryMapper {
  static toMealSummarySource(
    row: MealSummary,
  ): MealSummarySource {
    return {
      id: row.id,
      mealType: row.mealType,
      consumedAt: row.consumedAt,
      itemCount: row.items.length,
    }
  }

  static toMealItemSource(
    row: MealItem,
  ): MealItemSource {
    return {
      id: row.id,
      food: MealItemFoodMapper.toMealItemFoodSource(row.serving.food),
      serving: MealItemServingMapper.toMealItemServing(row.serving),
      quantity: row.quantity.toString(),
    };
  }

  static toMealDetailSource(
    row: MealDetail,
  ): MealDetailSource {
    return {
      id: row.id,
      mealType: row.mealType,
      consumedAt: row.consumedAt,
      items: row.items.map(MealRepositoryMapper.toMealItemSource),
    };
  }
}
