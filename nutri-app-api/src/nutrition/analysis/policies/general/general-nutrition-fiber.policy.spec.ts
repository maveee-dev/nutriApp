import {
  GENERAL_NUTRITION_FIBER_POLICY_ID,
  GENERAL_NUTRITION_FIBER_POLICY_VERSION,
  GeneralNutritionFiberPolicy,
} from './general-nutrition-fiber.policy.js';

describe('GeneralNutritionFiberPolicy', () => {
  const policy = new GeneralNutritionFiberPolicy();

  it('returns the approved population dietary-fiber reference with complete provenance', () => {
    expect(policy.calculate()).toEqual({
      fiberGrams: '28',
      provenance: {
        target: 'fiberGrams',
        policyId: GENERAL_NUTRITION_FIBER_POLICY_ID,
        source: 'FDA Daily Value reference under 21 CFR 101.9',
        sourceUrl: 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels',
        sourceVersion: '21-CFR-101.9-current',
        guideline: {
          name: 'Dietary Guidelines for Americans, 2025-2030',
          edition: '10th edition',
          url: 'https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines',
        },
        version: GENERAL_NUTRITION_FIBER_POLICY_VERSION,
        explanation: 'General population dietary-fiber reference of 28 g/day. This is a population reference, not an individualized clinical target.',
      },
    });
  });

  it('is deterministic and condition-agnostic', () => {
    expect(policy.calculate()).toEqual(policy.calculate());
  });
});
