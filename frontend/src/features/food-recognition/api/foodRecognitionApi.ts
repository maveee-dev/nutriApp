import { apiClient } from '@/api/client';
import type { FoodRecognitionRequest, FoodRecognitionResponse } from '../types/food-recognition.types';
export const foodRecognitionApi = { recognize: (request: FoodRecognitionRequest): Promise<FoodRecognitionResponse> => apiClient.post('/nutrition/food-recognition', request) };
