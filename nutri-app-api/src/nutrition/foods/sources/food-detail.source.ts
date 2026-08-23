import { FoodCategorySource } from "../../categories/sources/food-category.source.js";
import { FoodNutrientSource } from "../../nutrients/sources/food-nutrient.source.js";
import { ServingSource } from "../../servings/sources/serving.source.js";
import type { FoodPlanningClass } from '../types/food-planning-class.js';

export interface FoodDetailSource {
  readonly id: string;
  readonly source?: string;
  readonly sourceId?: string | null;
  readonly name: string;
  readonly displayName?: string;
  readonly variantLabel?: string | null;
  readonly category: FoodCategorySource;
  readonly planningClass?: FoodPlanningClass;
  readonly servings: readonly ServingSource[];
  readonly nutrients: readonly FoodNutrientSource[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
