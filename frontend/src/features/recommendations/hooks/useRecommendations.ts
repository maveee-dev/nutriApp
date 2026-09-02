import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '../api/recommendationsApi';
import type { PersonalizedRecommendationResponse, RecommendationQuery } from '../types/recommendation.types';

export const useRecommendations = (query: RecommendationQuery) => useQuery<PersonalizedRecommendationResponse, Error>({
  queryKey: ['personalized-recommendations', query],
  queryFn: () => recommendationsApi.getRecommendations(query),
  staleTime: 1000 * 60,
});
