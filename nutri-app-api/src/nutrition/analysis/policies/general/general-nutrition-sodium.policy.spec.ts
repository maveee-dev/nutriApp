import {
  GENERAL_NUTRITION_SODIUM_POLICY_ID,
  GENERAL_NUTRITION_SODIUM_POLICY_VERSION,
  GeneralNutritionSodiumPolicy,
} from './general-nutrition-sodium.policy.js';

describe('GeneralNutritionSodiumPolicy', () => {
  const policy = new GeneralNutritionSodiumPolicy();

  it('returns the approved population sodium reference with complete provenance', () => {
    expect(policy.calculate()).toEqual({
      sodiumMilligrams: '2300',
      provenance: {
        target: 'sodiumMilligrams',
        policyId: GENERAL_NUTRITION_SODIUM_POLICY_ID,
        source: 'FDA Daily Value reference under 21 CFR 101.9',
        sourceUrl: 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels',
        sourceVersion: '21-CFR-101.9-current',
        guideline: {
          name: 'Dietary Guidelines for Americans, 2025-2030',
          edition: '10th edition',
          url: 'https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines',
        },
        version: GENERAL_NUTRITION_SODIUM_POLICY_VERSION,
        explanation: 'General population sodium reference of 2300 mg/day. This is a population reference, not an individualized clinical target.',
      },
    });
  });

  it('is deterministic and does not inspect profile or condition data', () => {
    expect(policy.calculate()).toEqual(policy.calculate());
    expect(policy.calculate().sodiumMilligrams).toBe('2300');
  });
});
