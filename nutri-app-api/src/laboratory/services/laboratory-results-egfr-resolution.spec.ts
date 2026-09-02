import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LaboratoryResultsRepository } from '../repositories/laboratory-results.repository.js';
import { LaboratoryResultSource } from '../sources/laboratory-result.source.js';
import { LaboratoryResultsService } from './laboratory-results.service.js';
import { LaboratoryInterpreter } from './laboratory-interpreter.js';
import { EgfrInterpreter } from './egfr-interpreter.js';

const result = (overrides: Partial<LaboratoryResultSource> = {}): LaboratoryResultSource => ({
  id: 'lab-1', userId: 'user-1', testCode: 'egfr', value: '20', unit: 'mL/min/1.73m²',
  referenceLow: null, referenceHigh: null, collectedAt: new Date('2026-08-20T00:00:00.000Z'),
  createdAt: new Date('2026-08-20T00:00:00.000Z'), updatedAt: new Date('2026-08-20T00:00:00.000Z'), ...overrides,
});

describe('LaboratoryResultsService eGFR evidence resolution', () => {
  const repository = { findMany: jest.fn() } as unknown as LaboratoryResultsRepository;
  const service = new LaboratoryResultsService(repository, new LaboratoryInterpreter(new EgfrInterpreter()));

  beforeEach(() => jest.clearAllMocks());

  it('accepts a manually entered canonical eGFR result', async () => {
    repository.findMany = jest.fn().mockResolvedValue([result()]);
    await expect(service.findLatestEgfrEvidence('user-1')).resolves.toMatchObject({
      finding: expect.objectContaining({ value: '20', unit: 'mL/min/1.73m²' }),
      failureReason: null,
    });
  });

  it('reports invalid unit when all eGFR rows use unsupported units', async () => {
    repository.findMany = jest.fn().mockResolvedValue([result({ unit: 'mg/dL' })]);
    await expect(service.findLatestEgfrEvidence('user-1')).resolves.toMatchObject({ finding: null, failureReason: 'invalid-egfr-unit' });
  });

  it('reports invalid value when all eGFR rows contain invalid values', async () => {
    repository.findMany = jest.fn().mockResolvedValue([result({ value: 'not-a-number' })]);
    await expect(service.findLatestEgfrEvidence('user-1')).resolves.toMatchObject({ finding: null, failureReason: 'invalid-egfr-value' });
  });

  it('continues to an older valid eGFR when the newest row is invalid', async () => {
    repository.findMany = jest.fn().mockResolvedValue([
      result({ id: 'new-invalid', value: 'not-a-number', collectedAt: new Date('2026-08-20T00:00:00.000Z') }),
      result({ id: 'older-valid', value: '42', collectedAt: new Date('2026-08-19T00:00:00.000Z') }),
    ]);

    await expect(service.findLatestEgfrEvidence('user-1')).resolves.toMatchObject({
      finding: expect.objectContaining({ value: '42' }),
      failureReason: null,
    });
  });
});
