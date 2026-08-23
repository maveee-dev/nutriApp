import { CkdPhosphorusPolicy } from './ckd-phosphorus.policy.js';

describe('CkdPhosphorusPolicy', () => {
  const policy = new CkdPhosphorusPolicy();
  const target = {
    id: 'target-1', userId: 'user-1', nutrientKey: 'phosphorusMilligrams', kind: 'upper-limit' as const,
    targetValue: '800', unit: 'mg/day', approvalSource: 'CLINICIAN_APPROVED', sourceReference: 'care-plan-1',
    effectiveAt: new Date('2026-08-01T00:00:00Z'), approvedAt: new Date('2026-08-01T00:00:00Z'), expiresAt: null, version: 1,
  };
  const finding = { testCode: 'phosphorus', value: '4.5', unit: 'mg/dL', collectedAt: new Date('2026-08-20T00:00:00Z'), status: 'reported' as const, explanation: 'reported' };
  const egfr = { testCode: 'egfr', value: '20', unit: 'mL/min/1.73m2', collectedAt: new Date('2026-08-20T00:00:00Z'), status: 'reported' as const, explanation: 'reported' };

  it('resolves an approved phosphorus target with current serum evidence', () => {
    const result = policy.calculate(['ckd'], target, finding, egfr, 'INACTIVE', new Date('2026-08-22T00:00:00Z'));
    expect(result).toMatchObject({ phosphorusMilligrams: '800', deferredPolicy: null });
    expect(result.provenance).toEqual(expect.objectContaining({ target: 'phosphorusMilligrams', policyId: 'ckd-phosphorus-v1' }));
    expect(result.provenance?.applicability?.laboratory).toEqual(expect.objectContaining({ testCode: 'phosphorus', unit: 'mg/dL' }));
  });

  it('defers missing target, evidence, invalid target, and stale evidence explicitly', () => {
    expect(policy.calculate(['ckd'], null, finding, egfr, 'INACTIVE').deferredPolicy?.reason).toBe('missing-individualized-phosphorus-target');
    expect(policy.calculate(['ckd'], target, null, egfr, 'INACTIVE').deferredPolicy?.reason).toBe('missing-phosphorus');
    expect(policy.calculate(['ckd'], { ...target, unit: 'g/day' }, finding, egfr, 'INACTIVE').deferredPolicy?.reason).toBe('invalid-phosphorus-target-unit');
    expect(policy.calculate(['ckd'], target, { ...finding, collectedAt: new Date('2024-01-01T00:00:00Z') }, egfr, 'INACTIVE', new Date('2026-08-22T00:00:00Z')).deferredPolicy?.reason).toBe('stale-phosphorus');
  });

  it('does not apply outside CKD', () => {
    expect(policy.calculate([], target, finding, null, null)).toEqual({ phosphorusMilligrams: null, provenance: null, deferredPolicy: null });
  });
});
