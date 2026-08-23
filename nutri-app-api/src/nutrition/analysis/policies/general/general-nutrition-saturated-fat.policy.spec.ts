import {
  GENERAL_NUTRITION_SATURATED_FAT_POLICY_ID,
  GENERAL_NUTRITION_SATURATED_FAT_POLICY_VERSION,
  GeneralNutritionSaturatedFatPolicy,
} from './general-nutrition-saturated-fat.policy.js';

describe('GeneralNutritionSaturatedFatPolicy', () => {
  const policy = new GeneralNutritionSaturatedFatPolicy();

  it('returns the approved population saturated-fat reference with complete provenance', () => {
    expect(policy.calculate()).toEqual({
      saturatedFatGrams: '20',
      provenance: {
        target: 'saturatedFatGrams',
        policyId: GENERAL_NUTRITION_SATURATED_FAT_POLICY_ID,
        source: 'FDA Daily Value reference under 21 CFR 101.9',
        sourceUrl: 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels',
        sourceVersion: '21-CFR-101.9-current',
        guideline: {
          name: 'Dietary Guidelines for Americans, 2025-2030',
          edition: '10th edition',
          url: 'https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines',
        },
        version: GENERAL_NUTRITION_SATURATED_FAT_POLICY_VERSION,
        explanation: 'General population saturated-fat reference of 20 g/day. This is a population reference, not an individualized clinical target.',
      },
    });
  });

  it('is deterministic and condition-agnostic', () => {
    expect(policy.calculate()).toEqual(policy.calculate());
  });
});
