import { EnergyGoal } from '../policies/common/energy.policy.js';
import { ProfileSource } from '../../../profiles/sources/profile.source.js';
import { NutritionEvidenceSlices } from './nutrition-evidence-provider.type.js';

export type DialysisStatusContext = 'ACTIVE' | 'INACTIVE';
export type DialysisModalityContext = 'UNKNOWN' | 'HEMODIALYSIS' | 'PERITONEAL_DIALYSIS' | 'CONFLICTING';

export interface NutritionEvaluationContext {
  readonly profile: Pick<ProfileSource, 'weightKg'> & Partial<Pick<ProfileSource, 'age' | 'sex' | 'heightCm' | 'activityLevel' | 'nutritionGoal'>> | null;
  readonly conditionCodes: readonly string[];
  readonly energyGoal: EnergyGoal;
  readonly asOf: Date;
  readonly evidence: NutritionEvidenceSlices;
}
