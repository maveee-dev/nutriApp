import { apiClient } from '@/api/client';
import type { CustomizeMealPlanRequest, DailyMealPlan, MealPlanMeal } from '../types/meal-plan.types';

export const mealPlanApi = {
  getDaily: (date: string): Promise<DailyMealPlan> => apiClient.get('/nutrition/meal-plans/daily', { params: { date } }),
  customize: (request: CustomizeMealPlanRequest): Promise<MealPlanMeal> => apiClient.post('/nutrition/meal-plans/customize', request),
};
