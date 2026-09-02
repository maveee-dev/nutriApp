import type { ProfileSource } from '../../profiles/sources/profile.source.js';
import type { UserConditionSource } from '../../conditions/sources/user-condition.source.js';
import type { UserDialysisStatusSource } from '../../dialysis/sources/user-dialysis-status.source.js';
import type { NutritionTargetManagementSource } from '../../nutrition/targets/types/nutrition-target-management.type.js';

export interface UserAllergySource {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly reaction: string | null;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UserMedicationSource {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly dosage: string | null;
  readonly frequency: string | null;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface HealthProfileSource {
  readonly personal: ProfileSource | null;
  readonly conditions: readonly UserConditionSource[];
  readonly dialysis: UserDialysisStatusSource | null;
  readonly allergies: readonly UserAllergySource[];
  readonly medications: readonly UserMedicationSource[];
  readonly nutritionTargets: readonly NutritionTargetManagementSource[];
}
