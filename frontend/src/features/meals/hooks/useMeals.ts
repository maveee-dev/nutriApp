import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mealsApi } from '../api/mealsApi';
import { useToastStore } from '@/store/useToastStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { CreateMealRequest, FindMealsQuery } from '../types/meals.types';

export const useMeals = (query?: FindMealsQuery) => {
  const debouncedSearch = useDebouncedValue(query?.search ?? '', 300);
  const debouncedQuery = { ...query, search: debouncedSearch || undefined };

  return useQuery({
    queryKey: ['meals', debouncedQuery],
    queryFn: () => mealsApi.getMeals(debouncedQuery),
    placeholderData: (previousData) => previousData,
  });
};

export const useMealDetail = (id?: string) => {
  return useQuery({
    queryKey: ['meals', 'detail', id],
    queryFn: () => (id ? mealsApi.getMealDetail(id) : Promise.reject(new Error('No ID provided'))),
    enabled: !!id,
  });
};

export const useCreateMealMutation = (onSuccessCallback?: () => void) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (data: CreateMealRequest) => mealsApi.createMeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      showToast({
        type: 'success',
        title: 'Meal logged!',
        message: 'Your meal was successfully added to your daily log.',
      });
      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Failed to log meal',
        message: error.message,
      });
    },
  });
};

export const useDeleteMealMutation = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (id: string) => mealsApi.deleteMeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      showToast({
        type: 'info',
        title: 'Meal removed',
        message: 'The meal was removed from your log.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Could not delete meal',
        message: error.message,
      });
    },
  });
};
