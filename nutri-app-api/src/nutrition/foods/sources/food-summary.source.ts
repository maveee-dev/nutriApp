import type { FoodCategorySource } from "../../categories/sources/food-category.source.js";

export interface FoodSummarySource {
  id: string;
  name: string;
  category: FoodCategorySource;
}