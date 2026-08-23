import type { FoodCategorySource } from "../../categories/sources/food-category.source.js";
import type { FoodPlanningClass } from '../types/food-planning-class.js';

export interface FoodSummarySource {
  id: string;
  name: string;
  category: FoodCategorySource;
  planningClass?: FoodPlanningClass;
}
