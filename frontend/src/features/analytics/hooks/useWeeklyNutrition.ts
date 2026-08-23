import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analyticsApi';
import type { WeeklyNutritionResponse } from '../types/analytics.types';

export const useWeeklyNutrition = (startDate: string) => {
  return useQuery<WeeklyNutritionResponse, Error>({
    queryKey: ['nutrition', 'weekly', startDate],
    queryFn: () => analyticsApi.getWeeklyNutrition(startDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
