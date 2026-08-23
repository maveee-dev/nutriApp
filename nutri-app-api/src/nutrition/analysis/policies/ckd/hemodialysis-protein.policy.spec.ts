import { DialysisModality, DialysisStatus } from '../../../../../generated/prisma/client.js';
import { HemodialysisProteinPolicy } from './hemodialysis-protein.policy.js';

describe('HemodialysisProteinPolicy', () => {
  const policy = new HemodialysisProteinPolicy();
  const asOf = new Date('2026-08-17T00:00:00.000Z');

  it('applies an independent hemodialysis target with provenance and precedence', () => {
    const result = policy.calculate(
      { weightKg: 75 }, ['ckd'], DialysisStatus.ACTIVE,
      DialysisModality.HEMODIALYSIS, new Date('2026-08-16T00:00:00.000Z'), '60', asOf,
    );

    expect(result).toMatchObject({
      proteinGrams: '75',
      deferredPolicy: null,
      provenance: expect.objectContaining({
        policyId: 'hemodialysis-protein-v1',
        source: expect.stringContaining('KDOQI'),
        applicability: expect.objectContaining({ context: 'hemodialysis' }),
      }),
      adjustment: expect.objectContaining({
        conflictKey: 'nutrition-target:proteinGrams:daily-lower-limit',
        precedence: 'dialysis-over-general',
      }),
    });
  });

  it.each([
    [DialysisModality.UNKNOWN, 'missing-dialysis-modality'],
    [DialysisModality.CONFLICTING, 'conflicting-dialysis-modality'],
  ] as const)('defers %s modality evidence', (modality, reason) => {
    expect(policy.calculate(
      { weightKg: 75 }, ['ckd'], DialysisStatus.ACTIVE,
      modality, new Date('2026-08-16T00:00:00.000Z'), '60', asOf,
    ).deferredPolicy).toMatchObject({
      policyId: 'hemodialysis-protein-v1',
      reason,
    });
  });

  it('does not inherit hemodialysis behavior for peritoneal dialysis', () => {
    expect(policy.calculate(
      { weightKg: 75 }, ['ckd'], DialysisStatus.ACTIVE,
      DialysisModality.PERITONEAL_DIALYSIS, new Date('2026-08-16T00:00:00.000Z'), '60', asOf,
    )).toEqual({ proteinGrams: null, provenance: null, adjustment: null, deferredPolicy: null });
  });

  it('defers stale dialysis evidence', () => {
    expect(policy.calculate(
      { weightKg: 75 }, ['ckd'], DialysisStatus.ACTIVE,
      DialysisModality.HEMODIALYSIS, new Date('2025-08-16T00:00:00.000Z'), '60', asOf,
    ).deferredPolicy).toMatchObject({ reason: 'stale-dialysis-evidence' });
  });
});
