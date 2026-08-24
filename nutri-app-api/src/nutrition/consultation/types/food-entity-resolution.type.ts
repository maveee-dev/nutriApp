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
  | 'recipe-exact';

export type FoodEntityConfidence = 'high' | 'medium';

export interface FoodEntityCandidate {
  readonly kind: FoodEntityKind;
  readonly foodId?: string;
  readonly recipeId?: string;
  readonly recipeVersionId?: string;
  readonly displayName: string;
  readonly variantLabel?: string | null;
  readonly matchType: FoodEntityMatchType;
  readonly confidence: FoodEntityConfidence;
}

export interface FoodEntityResolution {
  readonly status: FoodEntityResolutionStatus;
  readonly query: string;
  readonly candidates: readonly FoodEntityCandidate[];
}
