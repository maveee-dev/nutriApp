import { IndividualizedNutritionTargetEvidenceRepository } from './individualized-nutrition-target-evidence.repository.js';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'target-1', userId: 'user-1', nutrientKey: 'potassiumMilligrams', kind: 'UPPER_LIMIT', targetValue: '2000', unit: 'mg/day',
    approvalSource: 'CLINICIAN_APPROVED', approvalStatus: 'APPROVED', sourceReference: null,
    effectiveAt: new Date('2026-08-01T00:00:00.000Z'), approvedAt: new Date('2026-08-01T00:00:00.000Z'), expiresAt: null, version: 1,
    rangeMin: null, rangeMax: null, notes: null, ...overrides,
  };
}

describe('IndividualizedNutritionTargetEvidenceRepository', () => {
  it('uses the latest target version and exposes only approved numeric rows to policy evidence', async () => {
    const findMany = async () => [
      row({ id: 'suggested', approvalStatus: 'SUGGESTED', version: 3 }),
      row({ id: 'approved', version: 2 }),
      row({ id: 'range', nutrientKey: 'proteinGrams', kind: 'RANGE', targetValue: null, rangeMin: '60', rangeMax: '90' }),
    ];
    const repository = new IndividualizedNutritionTargetEvidenceRepository({ individualizedNutritionTargetEvidence: { findMany } } as never);

    await expect(repository.findCurrentByUserId('user-1')).resolves.toEqual([]);
  });

  it('keeps management views aware of suggested and range records', async () => {
    const findMany = async () => [row({ approvalStatus: 'SUGGESTED' }), row({ id: 'range', nutrientKey: 'proteinGrams', kind: 'RANGE', targetValue: null, rangeMin: '60', rangeMax: '90' })];
    const repository = new IndividualizedNutritionTargetEvidenceRepository({ individualizedNutritionTargetEvidence: { findMany } } as never);
    const result = await repository.findLatestByUserId('user-1');
    expect(result.map((item) => item.kind)).toEqual(['upper-limit', 'range']);
    expect(result[0]?.approvalStatus).toBe('SUGGESTED');
  });
});
