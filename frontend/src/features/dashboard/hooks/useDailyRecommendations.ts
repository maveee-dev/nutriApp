import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import type { RecommendationResolution } from '../types/dashboard.types';

export const useDailyRecommendations = (date: string) => useQuery<RecommendationResolution, Error>({
  queryKey: ['recommendations', 'daily', date],
  queryFn: () => dashboardApi.getDailyRecommendations(date),
  staleTime: 1000 * 60 * 2,
});
