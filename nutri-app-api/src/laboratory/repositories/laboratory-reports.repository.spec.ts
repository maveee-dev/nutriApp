import { LaboratoryReportsRepository } from './laboratory-reports.repository.js';
import { jest } from '@jest/globals';

describe('LaboratoryReportsRepository', () => {
  it('stores supported report results and leaves unsupported values out of the clinical store', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'report-1', userId: 'user-1', reportDate: new Date('2026-08-30T00:00:00Z'), source: 'manual',
      createdAt: new Date('2026-08-30T01:00:00Z'), results: [],
    });
    const repository = new LaboratoryReportsRepository({ laboratoryReport: { create } } as never);

    await repository.create('user-1', {
      reportDate: new Date('2026-08-30T00:00:00Z'),
      results: [
        { testCode: 'potassium', value: '4.5', unit: 'mmol/L' },
        { testCode: 'not-supported', value: '1', unit: 'unit' },
      ],
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-1',
        source: 'manual',
        results: { create: [expect.objectContaining({ testCode: 'potassium', testName: 'Potassium' })] },
      }),
      include: { results: true },
    }));
  });

  it('retains legacy standalone laboratory results as synthetic historical reports', async () => {
    const findMany = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'legacy-1', userId: 'user-1', reportId: null, testCode: 'egfr', testName: null,
        value: { toString: () => '42' }, unit: 'mL/min/1.73m2', referenceLow: null, referenceHigh: null, flag: null,
        collectedAt: new Date('2026-08-20T00:00:00Z'), createdAt: new Date('2026-08-20T01:00:00Z'), updatedAt: new Date('2026-08-20T01:00:00Z'),
      }]);
    const repository = new LaboratoryReportsRepository({ laboratoryReport: { findMany }, laboratoryResult: { findMany } } as never);

    await expect(repository.findMany('user-1')).resolves.toMatchObject([{
      id: 'legacy-1', source: 'legacy-result', results: [{ id: 'legacy-1', testCode: 'egfr', reportId: null }],
    }]);
  });
});
