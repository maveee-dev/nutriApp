import {
  GENERAL_NUTRITION_CHOLESTEROL_POLICY_ID,
  GENERAL_NUTRITION_CHOLESTEROL_POLICY_VERSION,
  GeneralNutritionCholesterolPolicy,
} from './general-nutrition-cholesterol.policy.js';

describe('GeneralNutritionCholesterolPolicy', () => {
  const policy = new GeneralNutritionCholesterolPolicy();

  it('returns the approved population cholesterol reference with complete provenance', () => {
    expect(policy.calculate()).toEqual({
      cholesterolMilligrams: '300',
      provenance: {
        target: 'cholesterolMilligrams',
        policyId: GENERAL_NUTRITION_CHOLESTEROL_POLICY_ID,
        source: 'FDA Daily Value reference under 21 CFR 101.9',
        sourceUrl: 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels',
        sourceVersion: '21-CFR-101.9-current',
        guideline: {
          name: 'Dietary Guidelines for Americans, 2025-2030',
          edition: '10th edition',
          url: 'https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines',
        },
        version: GENERAL_NUTRITION_CHOLESTEROL_POLICY_VERSION,
        explanation: 'General population cholesterol reference of 300 mg/day. This is a population reference, not an individualized clinical target.',
      },
    });
  });

  it('is deterministic and condition-agnostic', () => {
    expect(policy.calculate()).toEqual(policy.calculate());
  });
});
