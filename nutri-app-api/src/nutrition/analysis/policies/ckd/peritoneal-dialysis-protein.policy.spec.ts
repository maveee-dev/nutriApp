import { DialysisModality, DialysisStatus } from '../../../../../generated/prisma/client.js';
import { PeritonealDialysisProteinPolicy } from './peritoneal-dialysis-protein.policy.js';

describe('PeritonealDialysisProteinPolicy', () => {
  const policy = new PeritonealDialysisProteinPolicy();
  const asOf = new Date('2026-08-17T00:00:00.000Z');

  it('applies an independently owned peritoneal-dialysis target', () => {
    const result = policy.calculate(
      { weightKg: 75 }, ['ckd'], DialysisStatus.ACTIVE,
      DialysisModality.PERITONEAL_DIALYSIS, new Date('2026-08-16T00:00:00.000Z'), '60', asOf,
    );

    expect(result).toMatchObject({
      proteinGrams: '75',
      provenance: expect.objectContaining({
        policyId: 'peritoneal-dialysis-protein-v1',
        applicability: expect.objectContaining({ context: 'peritoneal-dialysis' }),
      }),
      adjustment: expect.objectContaining({
        policyId: 'peritoneal-dialysis-protein-v1',
        conflictKey: 'nutrition-target:proteinGrams:daily-lower-limit',
      }),
      deferredPolicy: null,
    });
  });

  it('does not inherit Hemodialysis behavior', () => {
    expect(policy.calculate(
      { weightKg: 75 }, ['ckd'], DialysisStatus.ACTIVE,
      DialysisModality.HEMODIALYSIS, new Date('2026-08-16T00:00:00.000Z'), '60', asOf,
    )).toEqual({ proteinGrams: null, provenance: null, adjustment: null, deferredPolicy: null });
  });

  it('defers stale evidence and missing weight', () => {
    expect(policy.calculate(
      { weightKg: 75 }, ['ckd'], DialysisStatus.ACTIVE,
      DialysisModality.PERITONEAL_DIALYSIS, new Date('2025-08-16T00:00:00.000Z'), '60', asOf,
    ).deferredPolicy).toMatchObject({ reason: 'stale-dialysis-evidence' });

    expect(policy.calculate(
      null, ['ckd'], DialysisStatus.ACTIVE,
      DialysisModality.PERITONEAL_DIALYSIS, new Date('2026-08-16T00:00:00.000Z'), null, asOf,
    ).deferredPolicy).toMatchObject({ reason: 'missing-weight' });
  });
});
