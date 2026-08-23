import {
  GENERAL_NUTRITION_ADDED_SUGARS_POLICY_ID,
  GENERAL_NUTRITION_ADDED_SUGARS_POLICY_VERSION,
  GeneralNutritionAddedSugarsPolicy,
} from './general-nutrition-added-sugars.policy.js';

describe('GeneralNutritionAddedSugarsPolicy', () => {
  const policy = new GeneralNutritionAddedSugarsPolicy();

  it('returns the approved population added-sugars reference with complete provenance', () => {
    expect(policy.calculate()).toEqual({
      addedSugarGrams: '50',
      provenance: {
        target: 'addedSugarGrams',
        policyId: GENERAL_NUTRITION_ADDED_SUGARS_POLICY_ID,
        source: 'FDA Daily Value reference under 21 CFR 101.9',
        sourceUrl: 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels',
        sourceVersion: '21-CFR-101.9-current',
        guideline: {
          name: 'Dietary Guidelines for Americans, 2025-2030',
          edition: '10th edition',
          url: 'https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines',
        },
        version: GENERAL_NUTRITION_ADDED_SUGARS_POLICY_VERSION,
        explanation: 'General population added-sugars reference of 50 g/day. This is a population reference, not an individualized clinical target.',
      },
    });
  });

  it('is deterministic and condition-agnostic', () => {
    expect(policy.calculate()).toEqual(policy.calculate());
  });
});
