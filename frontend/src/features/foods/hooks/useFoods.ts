import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { foodsApi } from '../api/foodsApi';
import type { FoodsQuery } from '../types/foods.types';

export const useFoods = (query?: FoodsQuery) => {
  const debouncedSearch = useDebouncedValue(query?.search ?? '', 300);
  const debouncedQuery = { ...query, search: debouncedSearch || undefined };

  return useQuery({
    queryKey: ['foods', debouncedQuery],
    queryFn: () => foodsApi.getFoods(debouncedQuery),
    placeholderData: (previousData) => previousData,
  });
};

export const useFoodDetail = (id?: string) => {
  return useQuery({
    queryKey: ['foods', 'detail', id],
    queryFn: () => (id ? foodsApi.getFoodById(id) : Promise.reject(new Error('No ID provided'))),
    enabled: !!id,
  });
};
