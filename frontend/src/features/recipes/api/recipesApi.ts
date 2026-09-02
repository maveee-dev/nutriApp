import { apiClient } from '@/api/client';
import type { Recipe, RecipeEvaluation, RecipeNutrition, RecipeRequest } from '../types/recipe.types';

export const recipesApi = {
  list: (): Promise<Recipe[]> => apiClient.get('/recipes'),
  get: (id: string): Promise<Recipe> => apiClient.get(`/recipes/${id}`),
  create: (data: RecipeRequest): Promise<Recipe> => apiClient.post('/recipes', data),
  update: (id: string, data: Partial<RecipeRequest> & { isFavorite?: boolean }): Promise<Recipe> => apiClient.patch(`/recipes/${id}`, data),
  remove: (id: string): Promise<void> => apiClient.delete(`/recipes/${id}`),
  nutrition: (id: string): Promise<RecipeNutrition> => apiClient.get(`/recipes/${id}/nutrition`),
  evaluate: (id: string, params?: { servings?: string; version?: number }): Promise<RecipeEvaluation> => apiClient.post(`/recipes/${id}/evaluate`, undefined, { params }),
  addToDailyTracker: (id: string, data?: { date?: string; servings?: string; version?: number }): Promise<unknown> => apiClient.post(`/recipes/${id}/add-to-daily-tracker`, data ?? {}),
};
