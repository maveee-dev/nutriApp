import { createNutritionPolicySetFingerprint, createNutritionSnapshotFingerprint } from './nutrition-policy-set-fingerprint.js';

describe('nutrition policy fingerprints', () => {
  it('is independent of registration order', () => {
    const first = createNutritionPolicySetFingerprint([
      { policyId: 'b', version: 'v1' },
      { policyId: 'a', version: 'v2' },
    ]);
    const second = createNutritionPolicySetFingerprint([
      { policyId: 'a', version: 'v2' },
      { policyId: 'b', version: 'v1' },
    ]);
    expect(first).toBe(second);
  });

  it('changes when evaluator, policy set, or snapshot version changes', () => {
    const input = { evaluatorVersion: 'evaluator-v1', policySetFingerprint: 'policy-set-a', snapshotVersion: '1' };
    expect(createNutritionSnapshotFingerprint(input)).not.toBe(createNutritionSnapshotFingerprint({ ...input, snapshotVersion: '2' }));
    expect(createNutritionSnapshotFingerprint(input)).not.toBe(createNutritionSnapshotFingerprint({ ...input, evaluatorVersion: 'evaluator-v2' }));
    expect(createNutritionSnapshotFingerprint(input)).not.toBe(createNutritionSnapshotFingerprint({ ...input, policySetFingerprint: 'policy-set-b' }));
  });
});
