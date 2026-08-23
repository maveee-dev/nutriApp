import { snapshotEvidenceSource } from '../services/meal-evaluation-snapshot.adapter.js';
import { RecommendationContext } from '../types/recommendation-context.type.js';
import {
  DEFERRED_POLICY_RECOMMENDATION_POLICY_ID,
  DeferredPolicyRecommendationPolicy,
} from './deferred-policy-recommendation.policy.js';

describe('DeferredPolicyRecommendationPolicy', () => {
  it('owns generic explanations for deferred policies', () => {
    const snapshot = {
      id: 'snapshot-1',
      mealItemId: 'item-1',
      score: 80,
      coverage: 100,
      payload: {},
      evaluatorVersion: 'food-evaluation-v1',
      policyVersion: 'nutrition-policies-v1',
      snapshotVersion: '1',
      evaluatedAt: new Date('2026-08-17T04:00:00.000Z'),
    };
    const context: RecommendationContext<{
      deferredPolicies: readonly [{ policyId: string; reason: string; explanation: string }];
      evidenceSource: ReturnType<typeof snapshotEvidenceSource>;
    }> = {
      contextId: 'context-1',
      userId: 'user-1',
      scope: 'current-food',
      asOf: snapshot.evaluatedAt.toISOString(),
      projection: {
        deferredPolicies: [{
          policyId: 'ckd-protein',
          reason: 'missing-egfr',
          explanation: 'Provide a current eGFR result.',
        }],
        evidenceSource: snapshotEvidenceSource(snapshot),
      },
      sources: [snapshotEvidenceSource(snapshot)],
    };

    const candidates = new DeferredPolicyRecommendationPolicy().evaluate(context);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      candidateId: `${DEFERRED_POLICY_RECOMMENDATION_POLICY_ID}-ckd-protein`,
      conflictKey: 'policy:ckd-protein:current-food:deferred',
      recommendation: {
        category: 'deferred-policy',
        policy: { policyId: DEFERRED_POLICY_RECOMMENDATION_POLICY_ID },
      },
    });
  });
});
