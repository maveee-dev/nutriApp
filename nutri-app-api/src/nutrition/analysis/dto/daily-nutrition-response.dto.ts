export class NutritionTotalDto {
  name!: string;
  unit!: string;
  amount!: string;
}

export class DailyNutritionResponseDto {
  date!: string;
  mealCount!: number;
  totals!: NutritionTotalDto[];
  targets!: NutritionTargetsDto;
  insights!: NutritionInsightDto[];
  deferredPolicies!: NutritionPolicyDeferralDto[];
  caloriesConsumedKcal!: string | null;
  remainingCaloriesKcal!: string | null;
  calorieTargetPercentage!: number | null;
  energyGoal?: string;
  targetProvenance?: NutritionTargetProvenanceDto[];
  diabetesCarbohydrateAdherence?: DiabetesCarbohydrateAdherenceDto;
  dailyAdherence?: DailyAdherenceDto;
  dailyAdherenceByPolicy?: DailyAdherenceByPolicyDto[];
  mealAssessments?: MealAssessmentDto[];
  evaluationMode?: 'current-recomputation' | 'historical-replay';
  snapshotIds?: string[];
  evaluatorVersions?: string[];
  policySetFingerprints?: string[];
  snapshotFingerprints?: string[];
}

export class MealAssessmentDto {
  mealId?: string;
  status!: MealAssessmentStatus;
  coverage!: number;
  contributions!: MealAssessmentContributionDto[];
  rules!: MealAssessmentRuleResultDto[];
  deferredPolicies!: NutritionPolicyDeferralDto[];
  limitations!: MealAssessmentLimitationDto[];
  snapshotIds?: string[];
  evaluatorVersion?: string;
  policySetFingerprint?: string;
  evaluationFingerprint?: string;
}

export class DailyAdherenceDto {
  status!: string;
  targetValue!: string | null;
  consumedValue!: string | null;
  remainingValue!: string | null;
  exceededValue!: string | null;
  coveragePercentage!: number | null;
  targetProvenance?: NutritionTargetProvenanceDto | null;
  snapshotIds!: string[];
  deferredPolicy?: NutritionPolicyDeferralDto | null;
  evaluatorVersion?: string;
  policySetFingerprint?: string | null;
  evaluationFingerprint?: string;
}

export class DailyAdherenceByPolicyDto extends DailyAdherenceDto {
  policyId!: string;
  policyVersion!: string;
  target!: string;
  measurementKey!: string;
  ruleKind!: 'upper-limit' | 'lower-target' | 'recommended-range';
}

export class MealAssessmentContributionDto {
  nutrient!: string;
  unit?: string;
  amount!: string;
  targetValue!: string | null;
  currentDailyValue!: string | null;
  explanation!: string;
}

export class MealAssessmentNumericRuleDto {
  family!: 'numeric-constraint';
  kind!: 'upper-limit' | 'lower-target' | 'recommended-range';
  roles!: Array<'compatibility' | 'contribution' | 'progress'>;
  scopes!: Array<'food' | 'meal' | 'daily'>;
  measurementKey!: string;
  unit!: string;
  weight!: number;
  target!: string;
  targetValue!: string;
  policyId!: string;
  policyVersion!: string;
  conflictKey!: string;
  precedence!: number;
  provenance?: NutritionTargetProvenanceDto;
  supportingProvenance?: NutritionTargetProvenanceDto[];
}

export class MealAssessmentRuleResultDto {
  rule!: MealAssessmentNumericRuleDto;
  measuredValue!: string | null;
  targetValue!: string;
  percentageOfTarget!: number | null;
  status!: MealAssessmentRuleStatus;
  direction!: 'positive' | 'negative' | 'neutral' | null;
  explanation!: string;
  limitationCode?: MealAssessmentLimitationCode;
}

export class MealAssessmentLimitationDto {
  code!: MealAssessmentLimitationCode;
  explanation!: string;
  snapshotIds?: string[];
  evaluatorVersions?: string[];
  policySetFingerprints?: string[];
}

export class DiabetesCarbohydrateAdherenceDto {
  status!: string;
  targetCarbohydrateGrams!: string | null;
  consumedCarbohydrateGrams!: string | null;
  remainingCarbohydrateGrams!: string | null;
  exceededByGrams!: string | null;
  coveragePercentage!: number | null;
  targetProvenance?: NutritionTargetProvenanceDto | null;
  snapshotIds!: string[];
  deferredPolicy?: NutritionPolicyDeferralDto | null;
}

export class NutritionTargetsDto {
  sodiumMilligrams!: string;
  proteinGrams!: string | null;
  saturatedFatGrams?: string | null;
  addedSugarGrams?: string | null;
  cholesterolMilligrams?: string | null;
  fiberGrams?: string | null;
  carbohydrateGrams?: string | null;
  potassiumMilligrams?: string | null;
  phosphorusMilligrams?: string | null;
  caloriesKcal?: string | null;
}

export class NutritionTargetProvenanceDto {
  target!: string;
  policyId!: string;
  source!: string;
  sourceUrl?: string;
  sourceVersion?: string;
  guideline?: {
    name: string;
    edition: string;
    url: string;
  };
  applicability?: {
    context: string;
    conditionCode: string;
    dialysisStatus: string | null;
    laboratory?: {
      testCode: string;
      value: string;
      unit: string;
      collectedAt: string;
    };
    supportingSource?: {
      name: string;
      version: string;
      url: string;
    };
  };
  evidence?: {
    evidenceId?: string;
    evidenceVersion?: number;
    approvalSource: string;
    sourceReference: string | null;
    effectiveAt?: string;
    approvedAt: string;
    expiresAt: string | null;
  };
  version!: string;
  explanation!: string;
}

export class NutritionPolicyDeferralDto {
  policyId!: string;
  reason!: string;
  explanation!: string;
}

export class WeeklyNutritionResponseDto {
  startDate!: string;
  endDate!: string;
  days!: DailyNutritionResponseDto[];
}

export class NutritionInsightDto {
  ruleId!: string;
  severity!: string;
  measuredValue!: string;
  targetValue!: string;
  explanation!: string;
  policyId?: string;
  policyVersion?: string;
  provenance?: NutritionTargetProvenanceDto;
  evaluatorVersion?: string;
  snapshotId?: string;
}
import type {
  MealAssessmentLimitationCode,
  MealAssessmentRuleStatus,
  MealAssessmentStatus,
} from '../types/meal-assessment.type.js';
