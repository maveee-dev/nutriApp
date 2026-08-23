import { useQuery } from '@tanstack/react-query';
import { recipesApi } from '../api/recipesApi';
import type { AvailableRecipe } from '../types/meal-plan.types';

export const useAvailableRecipes = () => useQuery<AvailableRecipe[], Error>({
  queryKey: ['nutrition', 'recipes', 'available'],
  queryFn: recipesApi.getAvailable,
  staleTime: 1000 * 60 * 5,
});
