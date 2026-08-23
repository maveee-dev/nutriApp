import { DialysisStatus } from '../../../../../generated/prisma/client.js';
import { CkdProteinPolicy } from './ckd-protein.policy.js';

const egfr = (value: string) => ({
  testCode: 'egfr',
  value,
  unit: 'mL/min/1.73m²',
  collectedAt: new Date('2026-08-15T00:00:00.000Z'),
  status: 'reported' as const,
  explanation: 'reported',
});

describe('CkdProteinPolicy', () => {
  const policy = new CkdProteinPolicy();

  it('confirms the baseline for eligible non-dialysis CKD', () => {
    expect(policy.calculate({ weightKg: 75 }, ['ckd'], egfr('45'), DialysisStatus.INACTIVE, '60', new Date('2026-08-17T00:00:00.000Z'))).toMatchObject({
      proteinGrams: '60',
      provenance: expect.objectContaining({ policyId: 'ckd-non-dialysis-protein-v1' }),
      deferredPolicy: null,
    });
  });

  it.each([
    [null, 'missing eGFR'],
    [DialysisStatus.ACTIVE, 'active dialysis'],
  ] as const)('does not confirm the baseline when policy evidence is insufficient (%s)', (status, _reason) => {
    expect(policy.calculate({ weightKg: 75 }, ['ckd'], status === null ? null : egfr('45'), status, '60')).toMatchObject({
      proteinGrams: null,
      deferredPolicy: expect.objectContaining({ policyId: 'ckd-non-dialysis-protein-v1' }),
    });
  });

  it('defers stale eGFR evidence using the approved freshness window', () => {
    const result = policy.calculate(
      { weightKg: 75 },
      ['ckd'],
      egfr('45'),
      DialysisStatus.INACTIVE,
      '60',
      new Date('2027-08-16T00:00:00.000Z'),
    );

    expect(result).toMatchObject({
      proteinGrams: null,
      deferredPolicy: {
        policyId: 'ckd-non-dialysis-protein-v1',
        reason: 'stale-egfr',
      },
    });
  });

  it('distinguishes an invalid eGFR unit from missing evidence', () => {
    expect(policy.calculate(
      { weightKg: 75 }, ['ckd'], null, DialysisStatus.INACTIVE, '60', new Date('2026-08-17T00:00:00.000Z'),
      'invalid-egfr-unit', 'The latest eGFR result uses an unsupported unit.',
    ).deferredPolicy).toMatchObject({ reason: 'invalid-egfr-unit' });
  });

  it('distinguishes an invalid eGFR value from missing evidence', () => {
    expect(policy.calculate(
      { weightKg: 75 }, ['ckd'], null, DialysisStatus.INACTIVE, '60', new Date('2026-08-17T00:00:00.000Z'),
      'invalid-egfr-value', 'The latest eGFR result contains an invalid numeric value.',
    ).deferredPolicy).toMatchObject({ reason: 'invalid-egfr-value' });
  });
});
