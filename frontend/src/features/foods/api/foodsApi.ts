import { apiClient } from '@/api/client';
import type { OffsetPaginatedResponse } from '@/api/types';
import type { FoodSummary, FoodDetail, FoodsQuery } from '../types/foods.types';

export const foodsApi = {
  getFoods: (query?: FoodsQuery): Promise<OffsetPaginatedResponse<FoodSummary>> => {
    return apiClient.get('/foods', { params: query });
  },

  getFoodById: (id: string): Promise<FoodDetail> => {
    return apiClient.get(`/foods/${id}`);
  },
};
