import { CONDITION_CODES } from '../../../../conditions/types/condition-code.js';
import { NutritionTargetAdjustment, NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';

export const CARDIOVASCULAR_SODIUM_POLICY_ID = 'cardiovascular-sodium-v1';
export const CARDIOVASCULAR_SODIUM_POLICY_VERSION = 'v1';
export const CARDIOVASCULAR_SODIUM_CONFLICT_KEY = 'nutrition-target:sodiumMilligrams:daily-upper-limit';

const CARDIOVASCULAR_SODIUM_LIMIT_MILLIGRAMS = '1500';
const AHA_SODIUM_SOURCE = 'American Heart Association sodium guidance';
const AHA_SODIUM_SOURCE_VERSION = 'reviewed-2024-08-23';
const AHA_SODIUM_SOURCE_URL = 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/how-much-sodium-should-i-eat-per-day';
const AHA_CARDIOVASCULAR_GUIDELINE = {
  name: '2026 Dietary Guidance to Improve Cardiovascular Health: A Scientific Statement from the American Heart Association',
  edition: '2026 statement',
  url: 'https://professional.heart.org/en/science-news/2026-dietary-guidance-to-improve-cardiovascular-health',
} as const;

export interface CardiovascularSodiumPolicyResult {
  readonly sodiumMilligrams: string;
  readonly provenance: NutritionTargetProvenance;
  readonly adjustment: NutritionTargetAdjustment | null;
}

/** Applies the approved cardiovascular sodium limit only for supported hypertension context. */
export class CardiovascularSodiumPolicy {
  calculate(
    conditionCodes: readonly string[],
    baselineSodiumMilligrams: string,
    generalNutritionProvenance: NutritionTargetProvenance,
  ): CardiovascularSodiumPolicyResult {
    const provenance: NutritionTargetProvenance = {
      target: 'sodiumMilligrams',
      policyId: CARDIOVASCULAR_SODIUM_POLICY_ID,
      source: AHA_SODIUM_SOURCE,
      sourceUrl: AHA_SODIUM_SOURCE_URL,
      sourceVersion: AHA_SODIUM_SOURCE_VERSION,
      guideline: AHA_CARDIOVASCULAR_GUIDELINE,
      version: CARDIOVASCULAR_SODIUM_POLICY_VERSION,
      explanation: 'Cardiovascular sodium reference of 1500 mg/day for the supported hypertension context. This is a policy reference, not individualized medical advice.',
    };

    if (!conditionCodes.includes(CONDITION_CODES.HYPERTENSION)) {
      return {
        sodiumMilligrams: baselineSodiumMilligrams,
        provenance: generalNutritionProvenance,
        adjustment: null,
      };
    }

    return {
      sodiumMilligrams: CARDIOVASCULAR_SODIUM_LIMIT_MILLIGRAMS,
      provenance,
      adjustment: {
        target: 'sodiumMilligrams',
        from: baselineSodiumMilligrams,
        to: CARDIOVASCULAR_SODIUM_LIMIT_MILLIGRAMS,
        reasonCode: 'cardiovascular-sodium-limit',
        explanation: 'The Cardiovascular policy takes precedence over the General Nutrition sodium reference for the supported hypertension context.',
        policyId: CARDIOVASCULAR_SODIUM_POLICY_ID,
        policyVersion: CARDIOVASCULAR_SODIUM_POLICY_VERSION,
        conflictKey: CARDIOVASCULAR_SODIUM_CONFLICT_KEY,
        precedence: 'condition-specific-over-general',
        provenance,
        supportingProvenance: [generalNutritionProvenance],
      },
    };
  }
}
