import { NutritionTotal } from './nutrition-total.type.js';
import { NutritionInsightSource } from '../sources/nutrition-insight.source.js';
import { NutritionPolicyDeferralSource } from './nutrition-targets.type.js';
import { NutritionTargetProvenance, NutritionTargets } from './nutrition-targets.type.js';
import { DiabetesCarbohydrateAdherenceResult } from '../policies/diabetes/diabetes-carbohydrate-adherence.policy.js';
import { DailyMealAssessmentSource } from './meal-assessment.type.js';
import { DailyAdherenceSource } from './daily-adherence.source.js';
import { DailyAdherenceByPolicySource } from './daily-adherence.source.js';

export interface DailyNutritionSummarySource {
  readonly date: string;
  readonly mealCount: number;
  readonly totals: readonly NutritionTotal[];
  readonly targets: NutritionTargets;
  readonly insights: readonly NutritionInsightSource[];
  readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
  readonly caloriesConsumedKcal: string | null;
  readonly remainingCaloriesKcal: string | null;
  readonly calorieTargetPercentage: number | null;
  readonly energyGoal?: string;
  readonly targetProvenance?: readonly NutritionTargetProvenance[];
  readonly diabetesCarbohydrateAdherence?: DiabetesCarbohydrateAdherenceResult;
  /** Generic downstream view of the active daily-adherence projection. */
  readonly dailyAdherence?: DailyAdherenceSource;
  readonly dailyAdherenceByPolicy?: readonly DailyAdherenceByPolicySource[];
  readonly mealAssessments?: readonly DailyMealAssessmentSource[];
  readonly evaluationMode?: 'current-recomputation' | 'historical-replay';
  readonly snapshotIds?: readonly string[];
  readonly evaluatorVersions?: readonly string[];
  readonly policySetFingerprints?: readonly string[];
  readonly snapshotFingerprints?: readonly string[];
}

export interface WeeklyNutritionSummarySource {
  readonly startDate: string;
  readonly endDate: string;
  readonly days: readonly DailyNutritionSummarySource[];
}
