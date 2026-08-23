import { NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';

export const GENERAL_NUTRITION_CHOLESTEROL_POLICY_ID = 'general-nutrition-cholesterol-v1';
export const GENERAL_NUTRITION_CHOLESTEROL_POLICY_VERSION = 'v1';

const CHOLESTEROL_REFERENCE_MILLIGRAMS = '300';
const FDA_DAILY_VALUE_SOURCE = 'FDA Daily Value reference under 21 CFR 101.9';
const FDA_DAILY_VALUE_SOURCE_VERSION = '21-CFR-101.9-current';
const FDA_DAILY_VALUE_SOURCE_URL = 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels';
const DIETARY_GUIDELINES_SOURCE = {
  name: 'Dietary Guidelines for Americans, 2025-2030',
  edition: '10th edition',
  url: 'https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines',
} as const;

export interface GeneralNutritionCholesterolPolicyResult {
  readonly cholesterolMilligrams: string;
  readonly provenance: NutritionTargetProvenance;
}

/**
 * Preserves the v1 population reference for historical snapshot semantics.
 * This policy is intentionally not registered for current target resolution.
 */
export class GeneralNutritionCholesterolPolicy {
  calculate(): GeneralNutritionCholesterolPolicyResult {
    return {
      cholesterolMilligrams: CHOLESTEROL_REFERENCE_MILLIGRAMS,
      provenance: {
        target: 'cholesterolMilligrams',
        policyId: GENERAL_NUTRITION_CHOLESTEROL_POLICY_ID,
        source: FDA_DAILY_VALUE_SOURCE,
        sourceUrl: FDA_DAILY_VALUE_SOURCE_URL,
        sourceVersion: FDA_DAILY_VALUE_SOURCE_VERSION,
        guideline: DIETARY_GUIDELINES_SOURCE,
        version: GENERAL_NUTRITION_CHOLESTEROL_POLICY_VERSION,
        explanation: 'General population cholesterol reference of 300 mg/day. This is a population reference, not an individualized clinical target.',
      },
    };
  }
}
