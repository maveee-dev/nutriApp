import { useQuery } from '@tanstack/react-query';
import { mealPlannerApi } from '../api/mealPlannerApi';
import type { MealPlannerRequest, MealPlannerResponse } from '../types/meal-planner.types';

export const useMealPlanner = (params: MealPlannerRequest) => useQuery<MealPlannerResponse, Error>({
  queryKey: ['meal-planner', params],
  queryFn: () => mealPlannerApi.getRecommendations(params),
  staleTime: 0,
});

