export type FoodEntityResolutionStatus =
  | 'resolved'
  | 'ambiguous'
  | 'not-found';

export type FoodEntityKind = 'food' | 'approved-recipe';

export type FoodEntityMatchType =
  | 'display-exact'
  | 'alias-exact'
  | 'canonical-exact'
  | 'display-prefix'
  | 'alias-prefix'
  | 'canonical-prefix'
  | 'canonical-token-match'
  | 'fuzzy'
  | 'recipe-exact';

export type FoodEntityConfidence = 'high' | 'medium';

export interface FoodEntityCandidate {
  readonly kind: FoodEntityKind;
  /** Stable identifier for the selected entity (food ID or recipe version ID). */
  readonly stableId?: string;
  readonly foodId?: string;
  readonly recipeId?: string;
  readonly recipeVersionId?: string;
  readonly displayName: string;
  readonly variantLabel?: string | null;
  readonly canonicalName?: string;
  /** Optional user-facing context for disambiguating saved recipes. */
  readonly recipeYieldServings?: string;
  readonly recipeIngredientNames?: readonly string[];
  readonly matchType: FoodEntityMatchType;
  readonly confidence: FoodEntityConfidence;
}

export interface FoodEntityClarification {
  readonly message: string;
  readonly choices: readonly FoodEntityCandidate[];
}

export interface FoodEntityResolution {
  readonly status: FoodEntityResolutionStatus;
  readonly query: string;
  readonly candidates: readonly FoodEntityCandidate[];
  readonly clarification?: FoodEntityClarification;
}
