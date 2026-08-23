import { apiClient } from '@/api/client';
import type { OffsetPaginatedResponse } from '@/api/types';
import type {
  UserProfile,
  UpdateProfileRequest,
  Condition,
  UserCondition,
  UserDialysisStatus,
  UpdateDialysisStatusRequest,
  LaboratoryResult,
  CreateLaboratoryResultRequest,
} from '../types/health.types';

export const healthApi = {
  // Profile
  getMyProfile: (): Promise<UserProfile> => {
    return apiClient.get('/profile/me');
  },

  updateProfile: (data: UpdateProfileRequest): Promise<UserProfile> => {
    return apiClient.put('/profile', data);
  },

  // Conditions
  getConditions: (): Promise<OffsetPaginatedResponse<Condition>> => {
    return apiClient.get('/conditions', { params: { limit: 100 } });
  },

  getMyConditions: (): Promise<OffsetPaginatedResponse<UserCondition>> => {
    return apiClient.get('/conditions/me', { params: { limit: 100 } });
  },

  addMyCondition: (conditionId: string): Promise<UserCondition> => {
    return apiClient.post(`/conditions/me/${conditionId}`);
  },

  removeMyCondition: (conditionId: string): Promise<void> => {
    return apiClient.delete(`/conditions/me/${conditionId}`);
  },

  // Dialysis
  getDialysisStatus: (): Promise<UserDialysisStatus | null> => {
    return apiClient.get('/dialysis-status');
  },

  updateDialysisStatus: (data: UpdateDialysisStatusRequest): Promise<UserDialysisStatus> => {
    return apiClient.put('/dialysis-status', data);
  },

  // Laboratory Results
  getLabResults: (testCode?: string): Promise<LaboratoryResult[]> => {
    return apiClient.get('/laboratory/results', { params: { testCode } });
  },

  createLabResult: (data: CreateLaboratoryResultRequest): Promise<LaboratoryResult> => {
    return apiClient.post('/laboratory/results', data);
  },
};
