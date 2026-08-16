import { Decimal } from 'decimal.js';
import { CONDITION_CODES } from '../../../conditions/types/condition-code.js';
import { NutritionTargetAdjustment } from '../types/nutrition-targets.type.js';

const HYPERTENSION_SODIUM_LIMIT_MG = new Decimal(1500);

export interface HypertensionSodiumPolicyResult {
  readonly sodiumMilligrams: string;
  readonly adjustment: NutritionTargetAdjustment | null;
}

export class HypertensionSodiumPolicy {
  calculate(
    conditionCodes: readonly string[],
    baselineSodiumMilligrams: string,
  ): HypertensionSodiumPolicyResult {
    if (!conditionCodes.includes(CONDITION_CODES.HYPERTENSION)) {
      return { sodiumMilligrams: baselineSodiumMilligrams, adjustment: null };
    }

    const sodiumMilligrams = HYPERTENSION_SODIUM_LIMIT_MG.toString();
    return {
      sodiumMilligrams,
      adjustment: {
        target: 'sodiumMilligrams',
        from: baselineSodiumMilligrams,
        to: sodiumMilligrams,
        reasonCode: 'hypertension-sodium-limit',
        explanation:
          `Sodium target reduced from ${baselineSodiumMilligrams} mg/day to ${sodiumMilligrams} mg/day because condition code hypertension is present. This is an MVP product policy based on the selected AHA guideline and is not individualized medical advice.`,
      },
    };
  }
}
