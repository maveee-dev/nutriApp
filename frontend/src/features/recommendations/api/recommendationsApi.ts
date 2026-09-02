import { apiClient } from '@/api/client';
import type { PersonalizedRecommendationResponse, RecommendationQuery } from '../types/recommendation.types';

export const recommendationsApi = {
  getRecommendations: (query?: RecommendationQuery): Promise<PersonalizedRecommendationResponse> => apiClient.get('/recommendations', { params: query }),
};
