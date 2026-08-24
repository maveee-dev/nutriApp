import type {
  FoodEntityConfidence,
  FoodEntityKind,
  FoodEntityMatchType,
  FoodEntityResolutionStatus,
} from './food-entity-resolution.type.js';

export class FoodResolutionCandidateDto {
  kind!: FoodEntityKind;
  foodId?: string;
  recipeId?: string;
  recipeVersionId?: string;
  displayName!: string;
  variantLabel?: string | null;
  matchType!: FoodEntityMatchType;
  confidence!: FoodEntityConfidence;
}

export class FoodResolutionDto {
  status!: FoodEntityResolutionStatus;
  query!: string;
  candidates!: readonly FoodResolutionCandidateDto[];
}
