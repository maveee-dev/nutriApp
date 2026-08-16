import { toFoodCategorySource } from "../../../categories/mappers/repository/food-category-repository.mapper.js";
import { toServingSource } from "../../../servings/mappers/repository/serving-repository.mapper.js";
import { toNutrientSource } from "../../../nutrients/mappers/repository/nutrient-repository.mapper.js";
import { FoodDetailSource } from "../../sources/food-detail.source.js";
import { FoodSummarySource } from "../../sources/food-summary.source.js";
import { FoodWithCategory, FoodWithRelations } from '../../repositories/food.prisma.js';

export function tofoodDetailSource(
  row: FoodWithRelations,
): FoodDetailSource {
  return {
    id: row.id,
    name: row.name,
    category: toFoodCategorySource(row.category),
    servings: row.servings.map(toServingSource),
    nutrients: 
      row.nutrients.map((foodNutrient) => ({
        nutrient:
          toNutrientSource(foodNutrient.nutrient),

        amount:
          foodNutrient.amount.toString(),
      })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toFoodSummarySource(
  row: FoodWithCategory,
): FoodSummarySource {
  return {
    id: row.id,
    name: row.name,
    category: toFoodCategorySource(row.category),
  };
}
