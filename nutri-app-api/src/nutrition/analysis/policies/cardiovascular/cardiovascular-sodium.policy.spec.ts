import { GeneralNutritionSodiumPolicy } from '../general/general-nutrition-sodium.policy.js';
import {
  CARDIOVASCULAR_SODIUM_CONFLICT_KEY,
  CARDIOVASCULAR_SODIUM_POLICY_ID,
  CARDIOVASCULAR_SODIUM_POLICY_VERSION,
  CardiovascularSodiumPolicy,
} from './cardiovascular-sodium.policy.js';

describe('CardiovascularSodiumPolicy', () => {
  const policy = new CardiovascularSodiumPolicy();
  const generalNutrition = new GeneralNutritionSodiumPolicy().calculate();

  it('preserves the General Nutrition baseline when the cardiovascular context is absent', () => {
    expect(policy.calculate([], generalNutrition.sodiumMilligrams, generalNutrition.provenance)).toEqual({
      sodiumMilligrams: '2300',
      provenance: generalNutrition.provenance,
      adjustment: null,
    });
  });

  it('applies the cardiovascular sodium limit for hypertension with explicit precedence and supporting provenance', () => {
    expect(policy.calculate(['hypertension'], generalNutrition.sodiumMilligrams, generalNutrition.provenance)).toEqual({
      sodiumMilligrams: '1500',
      provenance: expect.objectContaining({
        policyId: CARDIOVASCULAR_SODIUM_POLICY_ID,
        version: CARDIOVASCULAR_SODIUM_POLICY_VERSION,
        source: 'American Heart Association sodium guidance',
      }),
      adjustment: expect.objectContaining({
        from: '2300',
        to: '1500',
        conflictKey: CARDIOVASCULAR_SODIUM_CONFLICT_KEY,
        precedence: 'condition-specific-over-general',
        policyId: CARDIOVASCULAR_SODIUM_POLICY_ID,
        supportingProvenance: [generalNutrition.provenance],
      }),
    });
  });

  it('is deterministic', () => {
    expect(policy.calculate(['hypertension'], '2300', generalNutrition.provenance))
      .toEqual(policy.calculate(['hypertension'], '2300', generalNutrition.provenance));
  });
});
