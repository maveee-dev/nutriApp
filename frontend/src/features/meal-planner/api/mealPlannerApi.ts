import { apiClient } from '@/api/client';
import type { MealPlannerRequest, MealPlannerResponse } from '../types/meal-planner.types';

export const mealPlannerApi = {
  getRecommendations: (params?: MealPlannerRequest): Promise<MealPlannerResponse> => apiClient.get('/meal-planner/recommendations', { params }),
  recommend: (data: MealPlannerRequest): Promise<MealPlannerResponse> => apiClient.post('/meal-planner/recommend', data),
  getRemainingBudget: (date?: string): Promise<{ date: string; totals: Record<string, { amount: string; unit: string }>; nutrients: MealPlannerResponse['remainingBudget'] }> => apiClient.get('/meal-planner/remaining-budget', { params: { date } }),
};

