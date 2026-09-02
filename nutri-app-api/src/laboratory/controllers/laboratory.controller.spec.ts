import { jest } from '@jest/globals';
import { LaboratoryController } from './laboratory.controller.js';
import { LaboratoryReportService } from '../services/laboratory-report.service.js';

describe('LaboratoryController', () => {
  it('maps report-history requests through the laboratory service', async () => {
    const report = { id: 'report-1', reportDate: new Date('2026-08-30T00:00:00Z'), source: 'manual', createdAt: new Date('2026-08-30T00:00:00Z'), results: [], nutritionInsights: [], ignoredTestCodes: [] };
    const service = { findMany: jest.fn().mockResolvedValue([report]) } as unknown as LaboratoryReportService;
    const controller = new LaboratoryController(service);

    await expect(controller.reports({ sub: 'user-1', email: 'user@example.com' })).resolves.toEqual([expect.objectContaining({ id: 'report-1', reportDate: '2026-08-30' })]);
    expect(service.findMany).toHaveBeenCalledWith('user-1');
  });
});
