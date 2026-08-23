import { apiClient } from '@/api/client';
import type { FoodEvaluationRequest, FoodEvaluationResponse } from '../types/evaluation.types';

export const evaluationApi = {
  evaluateFood: (data: FoodEvaluationRequest): Promise<FoodEvaluationResponse> => {
    return apiClient.post('/nutrition/food-evaluations', data);
  },
};
