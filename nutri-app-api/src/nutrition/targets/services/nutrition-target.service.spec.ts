import { BadRequestException } from '@nestjs/common';
import { NutritionTargetService } from './nutrition-target.service.js';

const target = (overrides: Record<string, unknown> = {}) => ({
  id: 'target-1', userId: 'user-1', nutrientKey: 'potassiumMilligrams', kind: 'upper-limit' as const,
  targetValue: '2000', unit: 'mg/day', approvalSource: 'CLINICIAN_APPROVED', approvalStatus: 'APPROVED' as const,
  sourceReference: null, effectiveAt: new Date('2026-08-01T00:00:00.000Z'), approvedAt: new Date('2026-08-01T00:00:00.000Z'),
  expiresAt: null, version: 1, rangeMin: null, rangeMax: null, notes: null, ...overrides,
});

describe('NutritionTargetService', () => {
  it('creates a validated approved target with a new immutable version', async () => {
    const repository = {
      nextVersion: async () => 2,
      create: async (input: Record<string, unknown>) => target({ id: 'target-2', version: input.version, targetValue: input.targetValue, approvalSource: input.approvalSource }),
    };
    const service = new NutritionTargetService(repository as never);

    await expect(service.create('user-1', {
      userId: 'user-1', nutrient: 'potassiumMilligrams', value: '1800', unit: 'mg/day', kind: 'UPPER_LIMIT', source: 'CLINICIAN', approvalStatus: 'APPROVED', effectiveAt: new Date('2026-08-01T00:00:00.000Z'),
    })).resolves.toMatchObject({ nutrient: 'potassiumMilligrams', value: '1800', version: 2, approvalStatus: 'APPROVED', source: 'CLINICIAN' });
  });

  it('keeps system suggestions out of the active approval state by default at the controller boundary', async () => {
    const repository = { nextVersion: async () => 1, create: async (input: Record<string, unknown>) => target({ approvalStatus: input.approvalStatus, approvalSource: input.approvalSource }) };
    const service = new NutritionTargetService(repository as never);

    await expect(service.create('user-1', {
      userId: 'user-1', nutrient: 'phosphorusMilligrams', value: '800', unit: 'mg/day', kind: 'UPPER_LIMIT', source: 'SYSTEM_SUGGESTED', approvalStatus: 'SUGGESTED', effectiveAt: new Date('2026-08-01T00:00:00.000Z'),
    })).resolves.toMatchObject({ source: 'SYSTEM_SUGGESTED', approvalStatus: 'SUGGESTED' });
  });

  it('rejects invalid units, non-positive values, and invalid date ranges', async () => {
    const service = new NutritionTargetService({} as never);
    await expect(service.create('user-1', { userId: 'user-1', nutrient: 'potassiumMilligrams', value: '0', unit: 'g/day', kind: 'UPPER_LIMIT', source: 'USER', approvalStatus: 'APPROVED', effectiveAt: new Date('2026-08-01T00:00:00.000Z'), expirationAt: new Date('2026-07-01T00:00:00.000Z') })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('represents ranges without exposing them to the numeric evaluator contract', async () => {
    const repository = { nextVersion: async () => 1, create: async (input: Record<string, unknown>) => target({ kind: 'range', targetValue: null, rangeMin: input.rangeMin, rangeMax: input.rangeMax }) };
    const service = new NutritionTargetService(repository as never);
    await expect(service.create('user-1', { userId: 'user-1', nutrient: 'proteinGrams', unit: 'g/day', kind: 'RANGE', source: 'USER', approvalStatus: 'APPROVED', effectiveAt: new Date('2026-08-01T00:00:00.000Z'), rangeMin: '60', rangeMax: '90' })).resolves.toMatchObject({ kind: 'RANGE', value: null, rangeMin: '60', rangeMax: '90' });
  });
});
