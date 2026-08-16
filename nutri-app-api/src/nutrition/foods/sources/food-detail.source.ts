import { FoodCategorySource } from "../../categories/sources/food-category.source.js";
import { FoodNutrientSource } from "../../nutrients/sources/food-nutrient.source.js";
import { ServingSource } from "../../servings/sources/serving.source.js";

export interface FoodDetailSource {
  readonly id: string;
  readonly name: string;
  readonly category: FoodCategorySource;
  readonly servings: readonly ServingSource[];
  readonly nutrients: readonly FoodNutrientSource[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}