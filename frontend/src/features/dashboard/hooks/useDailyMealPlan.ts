import { useMutation, useQuery } from '@tanstack/react-query';
import { mealPlanApi } from '../api/mealPlanApi';
import type { DailyMealPlan } from '../types/meal-plan.types';
import type { CustomizeMealPlanRequest, MealPlanMeal } from '../types/meal-plan.types';

export const useDailyMealPlan = (date: string) => useQuery<DailyMealPlan, Error>({
  queryKey: ['nutrition', 'meal-plan', 'daily', date],
  queryFn: () => mealPlanApi.getDaily(date),
  staleTime: 1000 * 60 * 2,
});

export const useCustomizeMealPlan = () => useMutation<MealPlanMeal, Error, CustomizeMealPlanRequest>({
  mutationFn: (request) => mealPlanApi.customize(request),
});
