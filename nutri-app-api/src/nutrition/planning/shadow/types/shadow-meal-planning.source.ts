import type { RecipeEvaluationSource } from '../../../recipes/types/recipe-evaluation.source.js';
import type { RecipeComponentSource } from '../../../recipes/types/recipe.source.js';
import type { DailyAdherenceSource } from '../../../analysis/types/daily-adherence.source.js';

export interface ShadowMealRankInputs {
  readonly clinicalEligibility: number;
  readonly mealCompleteness: number;
  readonly compatibilityScore: number;
  readonly evidenceCoverage: number;
  readonly activePolicyCoverage: number;
  readonly evaluationStatus?: 'evaluated' | 'insufficient-evidence';
  /** Meal-fit signal supplied by the evaluation layer. */
  readonly mealAssessmentStatus?: 'evaluated' | 'insufficient-evidence' | 'not-applicable';
  readonly mealAssessmentCoverage?: number;
  /** Context only; there is intentionally no candidate-specific adherence projection yet. */
  readonly dailyAdherenceStatus?: DailyAdherenceSource['status'];
}

export interface ShadowMealCandidateSource {
  readonly mealType: string;
  readonly templateId: string;
  readonly templateVersionId: string;
  readonly templateVersion: number;
  readonly templateName: string;
  readonly cuisine: string | null;
  readonly slotIds: readonly string[];
  readonly resolvedSources: readonly {
    readonly slotId: string;
    readonly source: 'recipe' | 'canonical-food';
    readonly sourceId: string;
    readonly label: string;
    readonly role?: string;
    readonly recipeId?: string | null;
    readonly recipeVersion?: number | null;
  }[];
  /** Internal composition used to evaluate the complete shadow day. */
  readonly components: readonly RecipeComponentSource[];
  readonly templateProvenance: {
    readonly sourceType: string;
    readonly sourceName: string | null;
    readonly sourceUrl: string | null;
    readonly sourceReference: string | null;
    readonly sourceVersion: string | null;
    readonly approvalStatus: string;
  };
  readonly evaluation: RecipeEvaluationSource;
  readonly rankInputs: ShadowMealRankInputs;
  readonly tieBreaker: string;
}

export interface ShadowMealPlanningResultSource {
  readonly apiVersion: 'shadow-v1';
  readonly userId: string;
  readonly date: string;
  readonly asOf: string;
  readonly evaluatedCandidateCount: number;
  readonly candidates: readonly ShadowMealCandidateSource[];
  readonly selected: readonly ShadowMealCandidateSource[];
  readonly dailyAdherence?: DailyAdherenceSource;
  readonly provenance: {
    readonly planner: 'recipe-template-shadow-planner';
    readonly selection: 'deterministic-ranked-shadow-only';
    readonly policySetFingerprints: readonly (string | null)[];
  };
}

export interface ShadowMealPlanningContext {
  readonly dailyAdherence?: DailyAdherenceSource;
}

export interface ShadowMealSubstitutionSource {
  readonly slotId: string;
  readonly recipeVersionId: string;
}
