import type { MealPlannerFocus, MealPlannerMealType } from './meal-planner.type.js';

export interface MealPlannerRequestInput {
  readonly date?: string;
  readonly mealType?: MealPlannerMealType;
  readonly focus?: MealPlannerFocus;
  readonly caloriesRemaining?: string;
  readonly limit?: number;
  readonly includeExplanation?: boolean;
}
