import { apiClient } from '@/api/client';
import type {
  CreateDailyNutritionEntryRequest,
  DailyNutritionResponse,
  UpdateDailyNutritionEntryRequest,
} from '../types/daily-tracker.types';

export const dailyTrackerApi = {
  getToday: (): Promise<DailyNutritionResponse> => apiClient.get('/daily-tracker/today'),
  getByDate: (date: string): Promise<DailyNutritionResponse> => apiClient.get(`/daily-tracker/${date}`),
  createEntry: (data: CreateDailyNutritionEntryRequest): Promise<DailyNutritionResponse> => apiClient.post('/daily-tracker/entries', data),
  updateEntry: (id: string, data: UpdateDailyNutritionEntryRequest): Promise<DailyNutritionResponse> => apiClient.patch(`/daily-tracker/entries/${id}`, data),
  deleteEntry: (id: string): Promise<void> => apiClient.delete(`/daily-tracker/entries/${id}`),
};

