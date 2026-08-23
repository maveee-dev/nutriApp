import { NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';

export const GENERAL_NUTRITION_FIBER_POLICY_ID = 'general-nutrition-fiber-v1';
export const GENERAL_NUTRITION_FIBER_POLICY_VERSION = 'v1';

const FIBER_REFERENCE_GRAMS = '28';
const FDA_DAILY_VALUE_SOURCE = 'FDA Daily Value reference under 21 CFR 101.9';
const FDA_DAILY_VALUE_SOURCE_VERSION = '21-CFR-101.9-current';
const FDA_DAILY_VALUE_SOURCE_URL = 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels';
const DIETARY_GUIDELINES_SOURCE = {
  name: 'Dietary Guidelines for Americans, 2025-2030',
  edition: '10th edition',
  url: 'https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines',
} as const;

export interface GeneralNutritionFiberPolicyResult {
  readonly fiberGrams: string;
  readonly provenance: NutritionTargetProvenance;
}

/** Provides the condition-agnostic population dietary-fiber reference. */
export class GeneralNutritionFiberPolicy {
  calculate(): GeneralNutritionFiberPolicyResult {
    return {
      fiberGrams: FIBER_REFERENCE_GRAMS,
      provenance: {
        target: 'fiberGrams',
        policyId: GENERAL_NUTRITION_FIBER_POLICY_ID,
        source: FDA_DAILY_VALUE_SOURCE,
        sourceUrl: FDA_DAILY_VALUE_SOURCE_URL,
        sourceVersion: FDA_DAILY_VALUE_SOURCE_VERSION,
        guideline: DIETARY_GUIDELINES_SOURCE,
        version: GENERAL_NUTRITION_FIBER_POLICY_VERSION,
        explanation: 'General population dietary-fiber reference of 28 g/day. This is a population reference, not an individualized clinical target.',
      },
    };
  }
}
