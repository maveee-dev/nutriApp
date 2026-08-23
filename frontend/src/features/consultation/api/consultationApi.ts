import { apiClient } from '@/api/client';
import type { NutritionConsultationRequest, NutritionConsultationResponse } from '../types/consultation.types';

export const consultationApi = {
  ask: (request: NutritionConsultationRequest): Promise<NutritionConsultationResponse> => apiClient.post('/nutrition/consultation', request),
};
