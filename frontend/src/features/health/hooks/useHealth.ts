import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthApi } from '../api/healthApi';
import { useToastStore } from '@/store/useToastStore';
import type {
  UpdateProfileRequest,
  UpdateDialysisStatusRequest,
  CreateLaboratoryResultRequest,
} from '../types/health.types';

// Profile Queries & Mutations
export const useProfile = () => {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => healthApi.getMyProfile(),
  });
};

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => healthApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      showToast({
        type: 'success',
        title: 'Profile updated',
        message: 'Your health profile has been updated.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Failed to update profile',
        message: error.message,
      });
    },
  });
};

// Conditions Queries & Mutations
export const useAvailableConditions = () => {
  return useQuery({
    queryKey: ['conditions', 'catalog'],
    queryFn: () => healthApi.getConditions(),
  });
};

export const useMyConditions = () => {
  return useQuery({
    queryKey: ['conditions', 'me'],
    queryFn: () => healthApi.getMyConditions(),
  });
};

export const useAddConditionMutation = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (conditionId: string) => healthApi.addMyCondition(conditionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conditions', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      showToast({
        type: 'success',
        title: 'Condition added',
        message: 'Your condition has been added to your profile.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Failed to add condition',
        message: error.message,
      });
    },
  });
};

export const useRemoveConditionMutation = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (conditionId: string) => healthApi.removeMyCondition(conditionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conditions', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      showToast({
        type: 'info',
        title: 'Condition removed',
        message: 'Condition was removed from your profile.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Failed to remove condition',
        message: error.message,
      });
    },
  });
};

// Dialysis Queries & Mutations
export const useDialysisStatus = () => {
  return useQuery({
    queryKey: ['dialysis-status'],
    queryFn: () => healthApi.getDialysisStatus(),
  });
};

export const useUpdateDialysisMutation = () => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (data: UpdateDialysisStatusRequest) => healthApi.updateDialysisStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialysis-status'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      showToast({
        type: 'success',
        title: 'Dialysis status updated',
        message: 'Your treatment status was updated.',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Failed to update dialysis status',
        message: error.message,
      });
    },
  });
};

// Laboratory Queries & Mutations
export const useLabResults = (testCode?: string) => {
  return useQuery({
    queryKey: ['laboratory', 'results', testCode],
    queryFn: () => healthApi.getLabResults(testCode),
  });
};

export const useCreateLabResultMutation = (onSuccessCallback?: () => void) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  return useMutation({
    mutationFn: (data: CreateLaboratoryResultRequest) => healthApi.createLabResult(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laboratory', 'results'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      showToast({
        type: 'success',
        title: 'Lab result saved',
        message: 'Your laboratory result was recorded.',
      });
      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Failed to save lab result',
        message: error.message,
      });
    },
  });
};
