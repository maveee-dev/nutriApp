import { apiClient } from '@/api/client';
import type { WeeklyNutritionResponse } from '../types/analytics.types';

export const analyticsApi = {
  getWeeklyNutrition: (startDate: string): Promise<WeeklyNutritionResponse> => {
    return apiClient.get('/nutrition/weekly', {
      params: { startDate },
    });
  },
};
