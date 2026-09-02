import { apiClient } from '@/api/client';
import type { CreateLaboratoryReportRequest, LaboratoryLatest, LaboratoryReport, LaboratoryTrend } from '../types/laboratory.types';

export const laboratoryApi = {
  getReports: (): Promise<LaboratoryReport[]> => apiClient.get('/laboratory/reports'),
  createReport: (data: CreateLaboratoryReportRequest): Promise<LaboratoryReport> => apiClient.post('/laboratory/reports', data),
  getReport: (id: string): Promise<LaboratoryReport> => apiClient.get(`/laboratory/reports/${id}`),
  getLatest: (): Promise<LaboratoryLatest> => apiClient.get('/laboratory/latest'),
  getTrends: (): Promise<LaboratoryTrend[]> => apiClient.get('/laboratory/trends'),
};
