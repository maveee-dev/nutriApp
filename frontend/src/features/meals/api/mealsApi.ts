import { apiClient } from '@/api/client';
import type { OffsetPaginatedResponse } from '@/api/types';
import type { CreateMealRequest, FindMealsQuery, MealDetail, MealSummary } from '../types/meals.types';

export const mealsApi = {
  getMeals: (query?: FindMealsQuery): Promise<OffsetPaginatedResponse<MealSummary>> => {
    return apiClient.get('/meals', { params: query });
  },

  getMealDetail: (id: string): Promise<MealDetail> => {
    return apiClient.get(`/meals/${id}`);
  },

  createMeal: (data: CreateMealRequest): Promise<MealDetail> => {
    return apiClient.post('/meals', data);
  },

  deleteMeal: (id: string): Promise<void> => {
    return apiClient.delete(`/meals/${id}`);
  },
};
