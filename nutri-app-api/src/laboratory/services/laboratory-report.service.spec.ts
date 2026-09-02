import { ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { LaboratoryReportService } from './laboratory-report.service.js';
import { LaboratoryReportsRepository } from '../repositories/laboratory-reports.repository.js';
import { LaboratoryAnalysisService } from './laboratory-analysis.service.js';

describe('LaboratoryReportService', () => {
  it('creates a report through the repository and marks unsupported input for the response', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue({
        id: 'report-1', userId: 'user-1', reportDate: new Date('2026-08-30T00:00:00Z'), source: 'manual',
        createdAt: new Date('2026-08-30T00:00:00Z'), results: [],
      }),
    } as unknown as LaboratoryReportsRepository;
    const service = new LaboratoryReportService(repository, new LaboratoryAnalysisService());

    const result = await service.create('user-1', {
      reportDate: new Date('2026-08-30T00:00:00Z'),
      results: [{ testCode: 'unsupported', value: '1', unit: 'u' }],
    });

    expect(result.ignoredTestCodes).toEqual(['unsupported']);
    expect(repository.create).toHaveBeenCalled();
  });

  it('does not permit deletion of immutable historical reports', async () => {
    const service = new LaboratoryReportService({} as LaboratoryReportsRepository, new LaboratoryAnalysisService());

    await expect(service.delete()).rejects.toThrow(ConflictException);
  });
});
