import { useQuery } from '@tanstack/react-query';
import { healthDashboardApi } from '../api/healthDashboardApi';
import type { HealthDashboardResponse } from '../types/health-dashboard.types';

export const useHealthDashboard = () => useQuery<HealthDashboardResponse, Error>({
  queryKey: ['health-dashboard', 'today'],
  queryFn: healthDashboardApi.getToday,
  staleTime: 1000 * 60,
});
