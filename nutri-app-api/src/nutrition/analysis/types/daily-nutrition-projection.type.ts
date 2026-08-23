import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';
import { DiabetesCarbohydrateAdherenceResult } from '../policies/diabetes/diabetes-carbohydrate-adherence.policy.js';
import { NutritionInsightSource } from '../sources/nutrition-insight.source.js';
import { NutritionTargetCalculation } from './nutrition-targets.type.js';
import { NutritionAnalysisMealSource } from '../sources/nutrition-analysis.source.js';
import { DailyMealAssessmentSource } from './meal-assessment.type.js';
import { DailyAdherenceSource } from './daily-adherence.source.js';
import { DailyAdherenceByPolicySource } from './daily-adherence.source.js';

export interface DailyNutritionProjectionContext {
  readonly date: string;
  readonly meals: readonly NutritionAnalysisMealSource[];
  readonly targetCalculation: NutritionTargetCalculation;
  readonly snapshots: readonly MealEvaluationSnapshotSource[];
  readonly totals: readonly { name: string; unit: string; amount: string }[];
  readonly historicalReplay: boolean;
}

export interface DailyNutritionProjectionResult {
  readonly mealAssessments?: readonly DailyMealAssessmentSource[];
  readonly diabetesCarbohydrateAdherence?: DiabetesCarbohydrateAdherenceResult;
  readonly dailyAdherence?: DailyAdherenceSource;
  readonly dailyAdherenceByPolicy?: readonly DailyAdherenceByPolicySource[];
  readonly insights?: readonly NutritionInsightSource[];
  readonly deferredPolicies: readonly { policyId: string; reason: string; explanation: string }[];
}

export interface DailyNutritionProjectionRegistration {
  readonly projectionId: string;
  readonly project: (context: DailyNutritionProjectionContext) => DailyNutritionProjectionResult;
}
