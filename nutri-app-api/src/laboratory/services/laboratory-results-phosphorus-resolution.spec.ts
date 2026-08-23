import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LaboratoryResultsRepository } from '../repositories/laboratory-results.repository.js';
import { LaboratoryResultSource } from '../sources/laboratory-result.source.js';
import { LaboratoryResultsService } from './laboratory-results.service.js';
import { LaboratoryInterpreter } from './laboratory-interpreter.js';
import { PhosphorusInterpreter } from './phosphorus-interpreter.js';

const result = (overrides: Partial<LaboratoryResultSource> = {}): LaboratoryResultSource => ({
  id: 'lab-1', userId: 'user-1', testCode: 'phosphorus', value: '4.5', unit: 'mg/dL',
  referenceLow: null, referenceHigh: null, collectedAt: new Date('2026-08-20T00:00:00.000Z'),
  createdAt: new Date('2026-08-20T00:00:00.000Z'), updatedAt: new Date('2026-08-20T00:00:00.000Z'), ...overrides,
});

describe('LaboratoryResultsService phosphorus evidence resolution', () => {
  const repository = { findMany: jest.fn() } as unknown as LaboratoryResultsRepository;
  const service = new LaboratoryResultsService(repository, new LaboratoryInterpreter(new PhosphorusInterpreter()));

  beforeEach(() => jest.clearAllMocks());

  it('returns the latest valid phosphorus finding', async () => {
    repository.findMany = jest.fn().mockResolvedValue([result()]);

    await expect(service.findLatestPhosphorusEvidence('user-1')).resolves.toMatchObject({
      finding: expect.objectContaining({ value: '4.5', unit: 'mg/dL' }),
      failureReason: null,
    });
  });

  it('continues past invalid rows and reports the invalid reason when none are usable', async () => {
    repository.findMany = jest.fn().mockResolvedValue([result({ unit: 'g/dL' })]);

    await expect(service.findLatestPhosphorusEvidence('user-1')).resolves.toMatchObject({
      finding: null,
      failureReason: 'invalid-phosphorus-unit',
    });
  });

  it('reports missing phosphorus evidence explicitly', async () => {
    repository.findMany = jest.fn().mockResolvedValue([]);

    await expect(service.findLatestPhosphorusEvidence('user-1')).resolves.toMatchObject({
      finding: null,
      failureReason: 'no-phosphorus-found',
    });
  });
});
