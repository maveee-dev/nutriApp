import type { NutritionTargetCalculation } from '../../../analysis/types/nutrition-targets.type.js';
import type { RecipeComponentSource } from '../../../recipes/types/recipe.source.js';
import type { RecipeEvaluationSource } from '../../../recipes/types/recipe-evaluation.source.js';
import type { ShadowDailyPlanningEvaluationSource } from '../types/shadow-daily-aggregate.source.js';
import type { MealAssessmentSource } from '../../../analysis/types/meal-assessment.type.js';
import type { DailyAdherenceSource } from '../../../analysis/types/daily-adherence.source.js';

export interface ShadowHistoricalMealSnapshot {
  readonly mealType: string;
  readonly templateVersionId: string;
  readonly templateVersion: number;
  readonly templateProvenance: ShadowDailyPlanningEvaluationSource['shadowPlan']['selected'][number]['templateProvenance'];
  readonly recipeVersionIds: readonly string[];
  readonly components: readonly RecipeComponentSource[];
  readonly recipeId: string;
  readonly recipeEvaluationVersionId: string;
  readonly recipeEvaluationVersion: number;
  readonly evaluationFingerprint: string;
  readonly canonicalFoodFingerprints: RecipeEvaluationSource['provenance']['canonicalFoods'];
  readonly targetCalculation: NutritionTargetCalculation;
  readonly deferredPolicyIds: readonly string[];
  readonly mealAssessment?: MealAssessmentSource;
}

export interface ShadowHistoricalDailySnapshot {
  readonly components: readonly RecipeComponentSource[];
  readonly recipeId: string;
  readonly recipeEvaluationVersionId: string;
  readonly recipeEvaluationVersion: number;
  readonly evaluationFingerprint: string;
  readonly canonicalFoodFingerprints: RecipeEvaluationSource['provenance']['canonicalFoods'];
  readonly targetCalculation: NutritionTargetCalculation;
  readonly deferredPolicyIds: readonly string[];
  readonly mealAssessment?: MealAssessmentSource;
}

export interface ShadowHistoricalMealPlanSnapshot {
  readonly apiVersion: 'shadow-historical-snapshot-v1';
  readonly userId: string;
  readonly date: string;
  readonly evaluationTimestamp: string;
  readonly policySetFingerprint: string | null;
  readonly meals: readonly ShadowHistoricalMealSnapshot[];
  readonly dailyAggregate: ShadowHistoricalDailySnapshot | null;
  readonly dailyAdherence?: DailyAdherenceSource;
  readonly snapshotFingerprint: string;
}

export interface ShadowHistoricalReplayResultSource {
  readonly apiVersion: 'shadow-historical-replay-v1';
  readonly snapshotFingerprint: string;
  readonly replayable: boolean;
  readonly failureReasons: readonly string[];
  readonly evaluationTimestamp: string;
  readonly policySetFingerprint: string | null;
  readonly replayedMealEvaluations: readonly RecipeEvaluationSource[];
  readonly replayedDailyEvaluation: RecipeEvaluationSource | null;
  readonly provenancePreserved: boolean;
  readonly limitations: readonly string[];
  readonly replayedDailyAdherence?: DailyAdherenceSource;
}
