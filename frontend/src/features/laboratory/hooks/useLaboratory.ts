import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '@/store/useToastStore';
import { laboratoryApi } from '../api/laboratoryApi';
import type { CreateLaboratoryReportRequest } from '../types/laboratory.types';

export const useLaboratoryReports = () => useQuery({
  queryKey: ['laboratory', 'reports'],
  queryFn: () => laboratoryApi.getReports(),
});

export const useLaboratoryLatest = () => useQuery({
  queryKey: ['laboratory', 'latest'],
  queryFn: () => laboratoryApi.getLatest(),
});

export const useLaboratoryTrends = () => useQuery({
  queryKey: ['laboratory', 'trends'],
  queryFn: () => laboratoryApi.getTrends(),
});

export const useCreateLaboratoryReportMutation = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (data: CreateLaboratoryReportRequest) => laboratoryApi.createReport(data),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['laboratory'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      showToast({ type: 'success', title: 'Laboratory report saved', message: `${report.results.length} supported result${report.results.length === 1 ? '' : 's'} recorded.` });
    },
    onError: (error: Error) => {
      showToast({ type: 'error', title: 'Could not save report', message: error.message });
    },
  });
};
