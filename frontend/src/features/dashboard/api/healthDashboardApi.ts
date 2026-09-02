import { apiClient } from '@/api/client';
import type { HealthDashboardResponse } from '../types/health-dashboard.types';

export const healthDashboardApi = {
  getToday: (): Promise<HealthDashboardResponse> => apiClient.get('/dashboard/today'),
};
