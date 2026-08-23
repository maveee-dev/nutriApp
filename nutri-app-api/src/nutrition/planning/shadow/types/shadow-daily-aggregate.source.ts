import type { RecipeEvaluationSource } from '../../../recipes/types/recipe-evaluation.source.js';
import type { ShadowMealPlanningResultSource } from './shadow-meal-planning.source.js';

export interface ShadowDailyAggregateEvaluationSource {
  readonly apiVersion: 'shadow-daily-aggregate-v1';
  readonly userId: string;
  readonly date: string;
  readonly asOf: string;
  readonly selectedMealTypes: readonly string[];
  readonly missingMealTypes: readonly string[];
  readonly evaluation: RecipeEvaluationSource | null;
  readonly limitations: readonly string[];
  readonly provenance: {
    readonly planner: 'recipe-template-shadow-planner';
    readonly templateVersionIds: readonly string[];
    readonly recipeVersionIds: readonly string[];
    readonly policySetFingerprint: string | null;
    readonly dailyPlanFingerprint: string | null;
  };
}

export interface ShadowDailyPlanningEvaluationSource {
  readonly shadowPlan: ShadowMealPlanningResultSource;
  readonly dailyAggregate: ShadowDailyAggregateEvaluationSource;
}
