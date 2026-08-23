import { apiClient } from '@/api/client';
import type { AvailableRecipe } from '../types/meal-plan.types';

export const recipesApi = {
  getAvailable: (): Promise<AvailableRecipe[]> => apiClient.get('/nutrition/recipes'),
};
