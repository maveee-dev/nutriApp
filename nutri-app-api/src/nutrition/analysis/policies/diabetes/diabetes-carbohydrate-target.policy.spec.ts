import { DiabetesTargetApprovalSource } from '../../../../../generated/prisma/client.js';
import {
  DIABETES_CARBOHYDRATE_TARGET_POLICY_ID,
  DiabetesCarbohydrateTargetPolicy,
} from './diabetes-carbohydrate-target.policy.js';

describe('DiabetesCarbohydrateTargetPolicy', () => {
  const policy = new DiabetesCarbohydrateTargetPolicy();

  it('does not apply outside an approved diabetes context', () => {
    expect(policy.calculate([], null)).toEqual({
      carbohydrateGrams: null,
      provenance: null,
      deferredPolicy: null,
    });
  });

  it('defers when an individualized target is unavailable', () => {
    expect(policy.calculate(['diabetes'], null)).toEqual({
      carbohydrateGrams: null,
      provenance: null,
      deferredPolicy: {
        policyId: DIABETES_CARBOHYDRATE_TARGET_POLICY_ID,
        reason: 'missing-individualized-carbohydrate-target',
        explanation: 'An approved individualized carbohydrate target is required for diabetes-specific carbohydrate guidance.',
      },
    });
  });

  it('consumes an approved target and preserves ADA provenance', () => {
    const result = policy.calculate(['diabetes'], {
      userId: 'user-1',
      targetGrams: '180',
      approvalSource: DiabetesTargetApprovalSource.CLINICIAN_APPROVED,
      sourceReference: 'care-plan-1',
      approvedAt: new Date('2026-08-17T00:00:00.000Z'),
      expiresAt: null,
    });

    expect(result.carbohydrateGrams).toBe('180');
    expect(result.deferredPolicy).toBeNull();
    expect(result.provenance).toEqual(expect.objectContaining({
      target: 'carbohydrateGrams',
      policyId: DIABETES_CARBOHYDRATE_TARGET_POLICY_ID,
      source: expect.stringContaining('American Diabetes Association'),
    }));
  });

  it('defers expired targets deterministically', () => {
    expect(policy.calculate(['diabetes'], {
      userId: 'user-1',
      targetGrams: '180',
      approvalSource: DiabetesTargetApprovalSource.USER_APPROVED,
      sourceReference: null,
      approvedAt: new Date('2026-08-01T00:00:00.000Z'),
      expiresAt: new Date('2026-08-10T00:00:00.000Z'),
    }, new Date('2026-08-17T00:00:00.000Z')).deferredPolicy).toEqual(expect.objectContaining({
      reason: 'expired-individualized-carbohydrate-target',
    }));
  });
});
