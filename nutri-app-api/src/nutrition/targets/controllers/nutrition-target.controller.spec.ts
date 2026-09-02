import { NutritionTargetController } from './nutrition-target.controller.js';

describe('NutritionTargetController', () => {
  it('maps API input to the user-owned target service', async () => {
    const service = { create: async (_userId: string, input: Record<string, unknown>) => ({ id: 'target-1', userId: 'user-1', nutrient: input.nutrient, value: input.value ?? null, unit: input.unit, kind: input.kind, source: input.source, approvalStatus: input.approvalStatus, effectiveAt: input.effectiveAt, expirationAt: null, version: 1, notes: null, rangeMin: null, rangeMax: null }) };
    const controller = new NutritionTargetController(service as never);
    await expect(controller.create({ sub: 'user-1' } as never, { nutrient: 'potassiumMilligrams', value: '2000', unit: 'mg/day', kind: 'UPPER_LIMIT', source: 'USER', effectiveAt: '2026-08-01T00:00:00.000Z' })).resolves.toMatchObject({ nutrient: 'potassiumMilligrams', value: '2000', approvalStatus: 'APPROVED' });
  });
});
