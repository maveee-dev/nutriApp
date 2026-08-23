import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { recommendationConflictKey, RecommendationCandidate } from '../types/recommendation-candidate.type.js';
import { RecommendationContext } from '../types/recommendation-context.type.js';
import { Recommendation } from '../types/recommendation.type.js';
import { DeterministicRecommendationResolver } from '../services/deterministic-recommendation.resolver.js';
import {
  SODIUM_RECOMMENDATION_POLICY_ID,
  SODIUM_RECOMMENDATION_POLICY_VERSION,
  SodiumRecommendationPolicy,
} from './sodium-recommendation.policy.js';
import { RecommendationService } from '../recommendation.service.js';

const evaluatedAt = new Date('2026-08-17T04:00:00.000Z');

function snapshot(
  reasonCode: 'sodium-contribution' | 'sodium-above-target' | null,
  overrides: Partial<MealEvaluationSnapshotSource> = {},
): MealEvaluationSnapshotSource {
  const reason = reasonCode == null ? [] : [{
    code: reasonCode,
    direction: reasonCode === 'sodium-above-target' ? 'negative' as const : 'neutral' as const,
    nutrient: 'sodium',
    measuredValue: reasonCode === 'sodium-above-target' ? '2500' : '100',
    targetValue: '2300',
    explanation: reasonCode === 'sodium-above-target'
      ? 'This portion provides 2500 mg of sodium, above the current daily limit of 2300 mg.'
      : 'This portion provides 100 mg of sodium against the current daily limit of 2300 mg.',
  }];
  return {
    id: 'snapshot-1',
    mealItemId: 'item-1',
    score: reasonCode === 'sodium-above-target' ? 0 : 98,
    coverage: 100,
    payload: {
      reasons: reason,
      contributions: [],
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      deferredPolicies: [],
    },
    evaluatorVersion: 'food-evaluation-v1',
    policyVersion: 'nutrition-policies-v1',
    snapshotVersion: '1',
    evaluatedAt,
    ...overrides,
  };
}

describe('RecommendationService with sodium registrations', () => {
  const service = new RecommendationService();

  it('generates positive feedback from an evaluated sodium contribution', () => {
    const result = service.recommend('user-1', snapshot('sodium-contribution'));

    expect(result.selected).toHaveLength(1);
    expect(result.selected[0]).toMatchObject({
      id: 'sodium-positive',
      category: 'positive',
      scope: 'current-food',
      nutrient: 'sodium',
      policy: {
        policyId: SODIUM_RECOMMENDATION_POLICY_ID,
        version: SODIUM_RECOMMENDATION_POLICY_VERSION,
      },
    });
  });

  it('generates caution and improvement recommendations for sodium above target', () => {
    const result = service.recommend('user-1', snapshot('sodium-above-target'), 'current-meal');

    expect(result.selected.map(({ id }) => id)).toEqual([
      'sodium-caution',
      'sodium-improvement',
    ]);
    expect(result.selected.every(({ scope }) => scope === 'current-meal')).toBe(true);
  });

  it('is deterministic for the same immutable snapshot and context', () => {
    const input = snapshot('sodium-above-target');

    expect(service.recommend('user-1', input, 'current-meal'))
      .toEqual(service.recommend('user-1', input, 'current-meal'));
  });

  it('preserves snapshot and policy provenance in recommendation evidence', () => {
    const input = snapshot('sodium-above-target', {
      evaluatorVersion: 'food-evaluation-v2',
      policyVersion: 'nutrition-policies-v3',
      snapshotVersion: '7',
    });
    const result = service.recommend('user-1', input);
    const evidence = result.selected[0]?.evidence[0];

    expect(evidence?.source).toMatchObject({
      sourceType: 'meal-evaluation-snapshot',
      sourceId: 'snapshot-1',
      evaluatorVersion: 'food-evaluation-v2',
      policyVersion: 'nutrition-policies-v3',
      snapshotVersion: '7',
    });
    expect(result.selected[0]?.policy.version).toBe(SODIUM_RECOMMENDATION_POLICY_VERSION);
  });

  it('uses a later snapshot without changing the earlier recommendation result', () => {
    const earlier = snapshot('sodium-contribution');
    const later = snapshot('sodium-above-target', {
      id: 'snapshot-2',
      snapshotVersion: '2',
      evaluatedAt: new Date('2026-08-18T04:00:00.000Z'),
    });

    expect(service.recommend('user-1', earlier).selected.map(({ id }) => id))
      .toEqual(['sodium-positive']);
    expect(service.recommend('user-1', later).selected.map(({ id }) => id))
      .toEqual(['sodium-caution', 'sodium-improvement']);
    expect(earlier.payload).toMatchObject({
      reasons: [{ code: 'sodium-contribution' }],
    });
  });

  it('delegates unrelated policy deferrals to the generic deferred-policy registration', () => {
    const input = snapshot('sodium-contribution');
    input.payload.deferredPolicies = [{
      policyId: 'ckd-protein',
      reason: 'missing-egfr',
      explanation: 'Provide a current eGFR result before more specific guidance is available.',
    }];

    const result = service.recommend('user-1', input);

    expect(result.selected.map(({ id }) => id)).toEqual([
      'sodium-positive',
      'deferred-policy-recommendation-ckd-protein',
    ]);
  });

  it('defers sodium guidance when the snapshot has no sodium evaluation reason', () => {
    const result = service.recommend('user-1', snapshot(null));

    expect(result.selected.map(({ id }) => id)).toEqual(['sodium-deferred-sodium-evidence-unavailable']);
  });

  it('rejects snapshots without the required immutable evaluation payload', () => {
    const input = snapshot('sodium-contribution', {
      payload: { reasons: [], contributions: [], deferredPolicies: [] },
    });

    expect(() => service.recommend('user-1', input)).toThrow(
      'Snapshot snapshot-1 does not contain valid nutrition targets.',
    );
  });
});

describe('SodiumRecommendationPolicy', () => {
  it('declares only current food and current meal scopes', () => {
    const policy = new SodiumRecommendationPolicy();

    expect(policy.scopes).toEqual(['current-food', 'current-meal']);
    expect(policy.policyId).toBe(SODIUM_RECOMMENDATION_POLICY_ID);
    expect(policy.version).toBe(SODIUM_RECOMMENDATION_POLICY_VERSION);
  });
});

describe('DeterministicRecommendationResolver', () => {
  const context: RecommendationContext = {
    contextId: 'context-1',
    userId: 'user-1',
    scope: 'current-food',
    asOf: evaluatedAt.toISOString(),
    sources: [],
    projection: {},
  };

  function candidate(
    id: string,
    category: Recommendation['category'],
    conflictKey: string,
    priority: number,
  ): RecommendationCandidate {
    return {
      candidateId: id,
      conflictKey: recommendationConflictKey(conflictKey),
      priority,
      specificity: 1,
      recommendation: {
        id,
        category,
        disposition: 'informational',
        severity: 'low',
        scope: 'current-food',
        title: id,
        message: id,
        evidence: [],
        policy: { policyId: 'test-policy', version: 'test-v1' },
      },
    };
  }

  it('keeps different sodium messages while resolving conflicts within one key', () => {
    const resolver = new DeterministicRecommendationResolver();
    const result = resolver.resolve(context, [
      candidate('positive', 'positive', 'sodium-positive', 50),
      candidate('caution', 'caution', 'sodium-caution', 80),
      candidate('weak-caution', 'caution', 'sodium-caution', 20),
    ]);

    expect(result.selected.map(({ id }) => id)).toEqual(['caution', 'positive']);
    expect(result.suppressed).toEqual([{
      candidateId: 'weak-caution',
      reason: 'lower-priority',
      comparedWith: 'caution',
    }]);
  });

  it('uses stable identifiers to resolve exact ties', () => {
    const resolver = new DeterministicRecommendationResolver();
    const result = resolver.resolve(context, [
      candidate('z-candidate', 'positive', 'same', 50),
      candidate('a-candidate', 'positive', 'same', 50),
    ]);

    expect(result.selected.map(({ id }) => id)).toEqual(['a-candidate']);
    expect(result.suppressed[0]?.reason).toBe('duplicate');
  });
});
