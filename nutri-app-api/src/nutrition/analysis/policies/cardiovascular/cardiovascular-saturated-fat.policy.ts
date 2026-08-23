import { Decimal } from 'decimal.js';
import { CONDITION_CODES } from '../../../../conditions/types/condition-code.js';
import { NutritionPolicyDeferralSource, NutritionTargetAdjustment, NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';

export const CARDIOVASCULAR_SATURATED_FAT_POLICY_ID = 'cardiovascular-saturated-fat-v1';
export const CARDIOVASCULAR_SATURATED_FAT_POLICY_VERSION = 'v1';
export const CARDIOVASCULAR_SATURATED_FAT_CONFLICT_KEY = 'nutrition-target:saturatedFatGrams:daily-upper-limit';

const SATURATED_FAT_CALORIE_PERCENT = new Decimal('0.06');
const SATURATED_FAT_CALORIES_PER_GRAM = new Decimal('9');
const AHA_SATURATED_FAT_SOURCE = 'American Heart Association saturated-fat guidance';
const AHA_SATURATED_FAT_SOURCE_VERSION = 'reviewed-2024-08-23';
const AHA_SATURATED_FAT_SOURCE_URL = 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats';
const AHA_CARDIOVASCULAR_GUIDELINE = {
  name: '2026 Dietary Guidance to Improve Cardiovascular Health: A Scientific Statement from the American Heart Association',
  edition: '2026 statement',
  url: 'https://professional.heart.org/en/science-news/2026-dietary-guidance-to-improve-cardiovascular-health',
} as const;

export interface CardiovascularSaturatedFatPolicyResult {
  readonly saturatedFatGrams: string;
  readonly provenance: NutritionTargetProvenance;
  readonly adjustment: NutritionTargetAdjustment | null;
  readonly deferredPolicy: NutritionPolicyDeferralSource | null;
}

/** Applies the AHA saturated-fat percentage reference only when supported energy evidence exists. */
export class CardiovascularSaturatedFatPolicy {
  calculate(
    conditionCodes: readonly string[],
    baselineSaturatedFatGrams: string,
    generalNutritionProvenance: NutritionTargetProvenance,
    maintenanceCaloriesKcal: string | null,
  ): CardiovascularSaturatedFatPolicyResult {
    if (!conditionCodes.includes(CONDITION_CODES.HYPERTENSION)) {
      return {
        saturatedFatGrams: baselineSaturatedFatGrams,
        provenance: generalNutritionProvenance,
        adjustment: null,
        deferredPolicy: null,
      };
    }

    const provenance: NutritionTargetProvenance = {
      target: 'saturatedFatGrams',
      policyId: CARDIOVASCULAR_SATURATED_FAT_POLICY_ID,
      source: AHA_SATURATED_FAT_SOURCE,
      sourceUrl: AHA_SATURATED_FAT_SOURCE_URL,
      sourceVersion: AHA_SATURATED_FAT_SOURCE_VERSION,
      guideline: AHA_CARDIOVASCULAR_GUIDELINE,
      version: CARDIOVASCULAR_SATURATED_FAT_POLICY_VERSION,
      explanation: 'Cardiovascular saturated-fat reference is less than 6% of maintenance energy for the supported hypertension context. This is a policy reference, not individualized medical advice.',
    };

    if (maintenanceCaloriesKcal == null) {
      return {
        saturatedFatGrams: baselineSaturatedFatGrams,
        provenance: generalNutritionProvenance,
        adjustment: null,
        deferredPolicy: {
          policyId: CARDIOVASCULAR_SATURATED_FAT_POLICY_ID,
          reason: 'missing-maintenance-energy',
          explanation: 'A complete profile is needed to calculate the cardiovascular saturated-fat reference from maintenance energy; the General Nutrition reference remains active.',
        },
      };
    }

    const target = new Decimal(maintenanceCaloriesKcal)
      .mul(SATURATED_FAT_CALORIE_PERCENT)
      .div(SATURATED_FAT_CALORIES_PER_GRAM)
      .toDecimalPlaces(2)
      .toString();

    return {
      saturatedFatGrams: target,
      provenance,
      deferredPolicy: null,
      adjustment: {
        target: 'saturatedFatGrams',
        from: baselineSaturatedFatGrams,
        to: target,
        reasonCode: 'cardiovascular-saturated-fat-limit',
        explanation: 'The Cardiovascular policy takes precedence over the General Nutrition saturated-fat reference for the supported hypertension context.',
        policyId: CARDIOVASCULAR_SATURATED_FAT_POLICY_ID,
        policyVersion: CARDIOVASCULAR_SATURATED_FAT_POLICY_VERSION,
        conflictKey: CARDIOVASCULAR_SATURATED_FAT_CONFLICT_KEY,
        precedence: 'condition-specific-over-general',
        provenance,
        supportingProvenance: [generalNutritionProvenance],
      },
    };
  }
}
