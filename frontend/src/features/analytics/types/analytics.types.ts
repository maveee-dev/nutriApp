import type { DailyNutritionResponse } from '@/features/dashboard/types/dashboard.types';

export interface WeeklyNutritionResponse {
  startDate: string;
  endDate: string;
  days: DailyNutritionResponse[];
}
