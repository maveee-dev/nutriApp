import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { DailyNutritionResponse } from '../types/dashboard.types';

export const useDailyNutrition = (date: string) => {
  return useQuery<DailyNutritionResponse, Error>({
    queryKey: ['nutrition', 'daily', date],
    queryFn: () => dashboardApi.getDailyNutrition(date),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
