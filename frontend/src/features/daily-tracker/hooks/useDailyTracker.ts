import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/store/useToastStore';
import { dailyTrackerApi } from '../api/dailyTrackerApi';
import type {
  CreateDailyNutritionEntryRequest,
  DailyNutritionResponse,
  UpdateDailyNutritionEntryRequest,
} from '../types/daily-tracker.types';

export const useDailyTracker = (date: string) => useQuery<DailyNutritionResponse, Error>({
  queryKey: ['daily-tracker', date],
  queryFn: () => dailyTrackerApi.getByDate(date),
  staleTime: 1000 * 60,
});

function invalidateTracker(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['daily-tracker'] });
  void queryClient.invalidateQueries({ queryKey: ['nutrition'] });
}

export const useCreateDailyNutritionEntryMutation = (onSuccessCallback?: () => void) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation<DailyNutritionResponse, Error, CreateDailyNutritionEntryRequest>({
    mutationFn: dailyTrackerApi.createEntry,
    onSuccess: () => {
      invalidateTracker(queryClient);
      showToast({ type: 'success', title: 'Added to today\'s intake', message: 'Your daily nutrition totals have been updated.' });
      onSuccessCallback?.();
    },
    onError: (error) => showToast({ type: 'error', title: 'Could not add food', message: error.message }),
  });
};

export const useUpdateDailyNutritionEntryMutation = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation<DailyNutritionResponse, Error, { id: string; data: UpdateDailyNutritionEntryRequest }>({
    mutationFn: ({ id, data }) => dailyTrackerApi.updateEntry(id, data),
    onSuccess: () => invalidateTracker(queryClient),
    onError: (error) => showToast({ type: 'error', title: 'Could not update intake', message: error.message }),
  });
};

export const useDeleteDailyNutritionEntryMutation = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  return useMutation<void, Error, string>({
    mutationFn: dailyTrackerApi.deleteEntry,
    onSuccess: () => {
      invalidateTracker(queryClient);
      showToast({ type: 'info', title: 'Food removed', message: 'Your daily nutrition totals have been updated.' });
    },
    onError: (error) => showToast({ type: 'error', title: 'Could not remove food', message: error.message }),
  });
};

