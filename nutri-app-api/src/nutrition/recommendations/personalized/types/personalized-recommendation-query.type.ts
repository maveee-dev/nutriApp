import type { MealPlannerMealType } from '../../../meal-planner/types/meal-planner.type.js';
import type { PersonalizedRecommendationGoal } from './personalized-recommendation.type.js';

export interface PersonalizedRecommendationQuery {
  readonly goal?: PersonalizedRecommendationGoal | string;
  readonly mealType?: MealPlannerMealType | string;
  readonly date?: string;
  readonly limit?: number;
}
