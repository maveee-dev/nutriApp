import { ActivityLevel, Sex } from '../../../../../generated/prisma/client.js';
import { Decimal } from 'decimal.js';
import { ProfileSource } from '../../../../profiles/sources/profile.source.js';
import { NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';

export type EnergyGoal = 'maintenance' | 'weight-loss' | 'muscle-gain' | 'weight-gain';

export interface EnergyPolicyResult {
  readonly caloriesKcal: string | null;
  readonly provenance: NutritionTargetProvenance | null;
}

const ACTIVITY_FACTORS: Record<ActivityLevel, string> = {
  [ActivityLevel.SEDENTARY]: '1.2',
  [ActivityLevel.LIGHT]: '1.375',
  [ActivityLevel.MODERATE]: '1.55',
  [ActivityLevel.ACTIVE]: '1.725',
  [ActivityLevel.VERY_ACTIVE]: '1.9',
};

/** Calculates an estimated maintenance energy target from a complete profile. */
export class EnergyPolicy {
  calculate(
    profile: Partial<Pick<ProfileSource, 'age' | 'sex' | 'heightCm' | 'weightKg' | 'activityLevel'>> | null,
    goal: EnergyGoal = 'maintenance',
  ): EnergyPolicyResult {
    if (
      profile?.age == null ||
      profile.sex == null ||
      profile.heightCm == null ||
      profile.weightKg == null ||
      profile.activityLevel == null
    ) {
      return { caloriesKcal: null, provenance: null };
    }

    const bmr = new Decimal(10)
      .mul(profile.weightKg)
      .plus(new Decimal('6.25').mul(profile.heightCm))
      .minus(new Decimal(5).mul(profile.age))
      .plus(profile.sex === Sex.MALE ? 5 : -161);
    const maintenance = bmr.mul(ACTIVITY_FACTORS[profile.activityLevel]);

    // Goal adjustments are intentionally deferred until a user goal model and
    // approved product policy are available. Current flows use maintenance.
    if (goal !== 'maintenance') {
      return { caloriesKcal: null, provenance: null };
    }

    const caloriesKcal = maintenance.toDecimalPlaces(0).toString();
    return {
      caloriesKcal,
      provenance: {
        target: 'caloriesKcal',
        policyId: 'energy-maintenance-v1',
        source: 'Mifflin-St Jeor equation with activity factor',
        version: 'v1',
        explanation: `Estimated maintenance energy target: ${caloriesKcal} kcal/day. This is a deterministic estimate based on the profile and is not individualized medical advice.`,
      },
    };
  }
}
