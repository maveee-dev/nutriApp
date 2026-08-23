import { NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';

export const GENERAL_NUTRITION_ADDED_SUGARS_POLICY_ID = 'general-nutrition-added-sugars-v1';
export const GENERAL_NUTRITION_ADDED_SUGARS_POLICY_VERSION = 'v1';

const ADDED_SUGARS_REFERENCE_GRAMS = '50';
const FDA_DAILY_VALUE_SOURCE = 'FDA Daily Value reference under 21 CFR 101.9';
const FDA_DAILY_VALUE_SOURCE_VERSION = '21-CFR-101.9-current';
const FDA_DAILY_VALUE_SOURCE_URL = 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels';
const DIETARY_GUIDELINES_SOURCE = {
  name: 'Dietary Guidelines for Americans, 2025-2030',
  edition: '10th edition',
  url: 'https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines',
} as const;

export interface GeneralNutritionAddedSugarsPolicyResult {
  readonly addedSugarGrams: string;
  readonly provenance: NutritionTargetProvenance;
}

/** Provides the condition-agnostic population added-sugars reference. */
export class GeneralNutritionAddedSugarsPolicy {
  calculate(): GeneralNutritionAddedSugarsPolicyResult {
    return {
      addedSugarGrams: ADDED_SUGARS_REFERENCE_GRAMS,
      provenance: {
        target: 'addedSugarGrams',
        policyId: GENERAL_NUTRITION_ADDED_SUGARS_POLICY_ID,
        source: FDA_DAILY_VALUE_SOURCE,
        sourceUrl: FDA_DAILY_VALUE_SOURCE_URL,
        sourceVersion: FDA_DAILY_VALUE_SOURCE_VERSION,
        guideline: DIETARY_GUIDELINES_SOURCE,
        version: GENERAL_NUTRITION_ADDED_SUGARS_POLICY_VERSION,
        explanation: 'General population added-sugars reference of 50 g/day. This is a population reference, not an individualized clinical target.',
      },
    };
  }
}
