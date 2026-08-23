import { NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';

export const GENERAL_NUTRITION_SATURATED_FAT_POLICY_ID = 'general-nutrition-saturated-fat-v1';
export const GENERAL_NUTRITION_SATURATED_FAT_POLICY_VERSION = 'v1';

const SATURATED_FAT_REFERENCE_GRAMS = '20';
const FDA_DAILY_VALUE_SOURCE = 'FDA Daily Value reference under 21 CFR 101.9';
const FDA_DAILY_VALUE_SOURCE_VERSION = '21-CFR-101.9-current';
const FDA_DAILY_VALUE_SOURCE_URL = 'https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels';
const DIETARY_GUIDELINES_SOURCE = {
  name: 'Dietary Guidelines for Americans, 2025-2030',
  edition: '10th edition',
  url: 'https://odphp.health.gov/our-work/nutrition-physical-activity/dietary-guidelines',
} as const;

export interface GeneralNutritionSaturatedFatPolicyResult {
  readonly saturatedFatGrams: string;
  readonly provenance: NutritionTargetProvenance;
}

/** Provides the condition-agnostic population saturated-fat reference. */
export class GeneralNutritionSaturatedFatPolicy {
  calculate(): GeneralNutritionSaturatedFatPolicyResult {
    return {
      saturatedFatGrams: SATURATED_FAT_REFERENCE_GRAMS,
      provenance: {
        target: 'saturatedFatGrams',
        policyId: GENERAL_NUTRITION_SATURATED_FAT_POLICY_ID,
        source: FDA_DAILY_VALUE_SOURCE,
        sourceUrl: FDA_DAILY_VALUE_SOURCE_URL,
        sourceVersion: FDA_DAILY_VALUE_SOURCE_VERSION,
        guideline: DIETARY_GUIDELINES_SOURCE,
        version: GENERAL_NUTRITION_SATURATED_FAT_POLICY_VERSION,
        explanation: 'General population saturated-fat reference of 20 g/day. This is a population reference, not an individualized clinical target.',
      },
    };
  }
}
