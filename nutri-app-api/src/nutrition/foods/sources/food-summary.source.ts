import type { FoodCategorySource } from "../../categories/sources/food-category.source.js";
import type { FoodPlanningClass } from '../types/food-planning-class.js';

export interface FoodSummarySource {
  id: string;
  name: string;
  /** Canonical description used only as a search signal; never for evaluation. */
  description?: string | null;
  displayName?: string;
  variantLabel?: string | null;
  searchPriority?: number;
  searchAliases?: readonly string[];
  category: FoodCategorySource;
  planningClass?: FoodPlanningClass;
}
