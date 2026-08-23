import { apiClient } from '@/api/client';
import type { DailyNutritionResponse, RecommendationResolution } from '../types/dashboard.types';

export const dashboardApi = {
  getDailyNutrition: (date: string): Promise<DailyNutritionResponse> => {
    return apiClient.get('/nutrition/daily', {
      params: { date },
    });
  },
  getDailyRecommendations: (date: string): Promise<RecommendationResolution> => {
    return apiClient.get('/nutrition/recommendations/daily', { params: { date } });
  },
};
