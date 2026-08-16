import { DialysisStatus } from '../../../../generated/prisma/client.js';
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
    expect(policy.calculate({ weightKg: 75 }, ['ckd'], egfr('45'), DialysisStatus.INACTIVE, '60')).toBe('60');
  });

  it.each([
    [null, 'missing eGFR'],
    [DialysisStatus.ACTIVE, 'active dialysis'],
  ] as const)('does not confirm the baseline when policy evidence is insufficient (%s)', (status, _reason) => {
    expect(policy.calculate({ weightKg: 75 }, ['ckd'], status === null ? null : egfr('45'), status, '60')).toBeNull();
  });
});
