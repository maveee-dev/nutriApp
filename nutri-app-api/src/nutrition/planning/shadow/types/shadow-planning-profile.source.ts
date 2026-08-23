export type ShadowPlanningStage =
  | 'databaseLoadingMs'
  | 'templateSelectionMs'
  | 'slotResolutionMs'
  | 'recipeEvaluationMs'
  | 'rankingMs'
  | 'dailyAggregateEvaluationMs';

export interface ShadowPlanningMetrics {
  readonly totalExecutionMs: number;
  readonly stages: Readonly<Record<ShadowPlanningStage, number>>;
  readonly templatesEvaluated: number;
  readonly recipesEvaluated: number;
  readonly recipeEvaluations: number;
  readonly recipeComponentsEvaluated: number;
  readonly policyEvaluations: number;
  readonly nutritionAggregations: number;
  readonly candidateMealsGenerated: number;
  readonly candidateMealsDiscarded: number;
  readonly slotsWithoutCandidates: number;
  readonly disallowedFallbacks: number;
  readonly databaseQueryCounts: {
    readonly templateLookups: number;
    readonly recipeLookups: number;
    readonly canonicalFoodLookups: number;
    readonly servingLookups: number;
  };
  readonly maximumCandidatesPerSlot: number;
  readonly maximumSlotCombinations: number;
  readonly combinationLimitHits: number;
}

export interface ShadowPlanningProfileSource {
  readonly apiVersion: 'internal-shadow-profile-v1';
  readonly userId: string;
  readonly date: string;
  readonly asOf: string;
  readonly metrics: ShadowPlanningMetrics;
  readonly candidateCount: number;
  readonly selectedMealTypes: readonly string[];
  readonly dailyAggregateEvaluated: boolean;
  readonly bottlenecks: readonly string[];
  readonly optimizationOpportunities: readonly string[];
}
