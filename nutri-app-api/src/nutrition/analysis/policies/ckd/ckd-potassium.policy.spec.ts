import { CkdPotassiumPolicy } from './ckd-potassium.policy.js';

describe('CkdPotassiumPolicy', () => {
  const policy = new CkdPotassiumPolicy();
  const target = {
    id: 'target-1', userId: 'user-1', nutrientKey: 'potassiumMilligrams', kind: 'upper-limit' as const,
    targetValue: '2000', unit: 'mg/day', approvalSource: 'CLINICIAN_APPROVED', sourceReference: 'care-plan-1',
    effectiveAt: new Date('2026-08-01T00:00:00Z'), approvedAt: new Date('2026-08-01T00:00:00Z'), expiresAt: null, version: 1,
  };
  const finding = { testCode: 'potassium', value: '5.2', unit: 'mmol/L', collectedAt: new Date('2026-08-20T00:00:00Z'), status: 'reported' as const, explanation: 'reported' };

  it('resolves an approved target only with current potassium evidence', () => {
    const result = policy.calculate(['ckd'], target, finding, new Date('2026-08-22T00:00:00Z'));
    expect(result).toMatchObject({ potassiumMilligrams: '2000', deferredPolicy: null });
    expect(result.provenance).toEqual(expect.objectContaining({ target: 'potassiumMilligrams', policyId: 'ckd-potassium-v1' }));
    expect(result.provenance?.applicability?.laboratory).toEqual(expect.objectContaining({ testCode: 'potassium', unit: 'mmol/L' }));
  });

  it('defers missing, stale, and unsupported evidence explicitly', () => {
    expect(policy.calculate(['ckd'], null, finding)).toEqual({ potassiumMilligrams: null, provenance: null, deferredPolicy: null });
    expect(policy.calculate(['ckd'], target, null).deferredPolicy?.reason).toBe('missing-potassium');
    expect(policy.calculate(['ckd'], target, { ...finding, collectedAt: new Date('2024-01-01T00:00:00Z') }, new Date('2026-08-22T00:00:00Z')).deferredPolicy?.reason).toBe('stale-potassium');
    expect(policy.calculate(['ckd'], { ...target, kind: 'lower-target' }, finding).deferredPolicy?.reason).toBe('unsupported-potassium-target-kind');
  });
});
