import { decodeMealEvaluationSnapshot, snapshotEvidenceSource } from './meal-evaluation-snapshot.adapter.js';

function validSnapshot() {
  return {
    id: 'snapshot-1',
    mealItemId: 'item-1',
    score: 90,
    coverage: 100,
    payload: {
      reasons: [{
        code: 'sodium-contribution',
        direction: 'neutral',
        nutrient: 'sodium',
        measuredValue: '100',
        targetValue: '2300',
        explanation: 'Sodium is within the current limit.',
      }],
      contributions: [],
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      deferredPolicies: [],
    },
    evaluatorVersion: 'food-evaluation-v1',
    policyVersion: 'nutrition-policies-v1',
    snapshotVersion: '1',
    evaluatedAt: new Date('2026-08-17T04:00:00.000Z'),
  };
}

describe('meal evaluation snapshot adapter', () => {
  it('decodes the complete typed evaluation payload', () => {
    expect(decodeMealEvaluationSnapshot(validSnapshot())).toMatchObject({
      targets: { sodiumMilligrams: '2300' },
      reasons: [{ code: 'sodium-contribution' }],
      deferredPolicies: [],
    });
  });

  it('rejects malformed reasons before a policy consumes them', () => {
    const snapshot = validSnapshot();
    snapshot.payload.reasons = [{ code: 'invalid' } as any];

    expect(() => decodeMealEvaluationSnapshot(snapshot)).toThrow(
      'Snapshot snapshot-1 does not contain valid evaluation reasons.',
    );
  });

  it('rejects malformed deferred policies before a policy consumes them', () => {
    const snapshot = validSnapshot();
    (snapshot.payload as any).deferredPolicies = [{ policyId: 'missing-fields' }];

    expect(() => decodeMealEvaluationSnapshot(snapshot)).toThrow(
      'Snapshot snapshot-1 does not contain valid deferred policies.',
    );
  });

  it('maps all snapshot provenance versions consistently', () => {
    const snapshot = validSnapshot();
    snapshot.evaluatorVersion = 'food-evaluation-v2';
    snapshot.policyVersion = 'nutrition-policies-v3';
    snapshot.snapshotVersion = '7';

    expect(snapshotEvidenceSource(snapshot)).toMatchObject({
      sourceType: 'meal-evaluation-snapshot',
      sourceId: 'snapshot-1',
      evaluatorVersion: 'food-evaluation-v2',
      policyVersion: 'nutrition-policies-v3',
      snapshotVersion: '7',
    });
  });
});
