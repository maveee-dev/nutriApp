import type {
  FoodEntityConfidence,
  FoodEntityKind,
  FoodEntityMatchType,
  FoodEntityResolutionStatus,
} from './food-entity-resolution.type.js';

export class FoodResolutionCandidateDto {
  kind!: FoodEntityKind;
  stableId?: string;
  foodId?: string;
  recipeId?: string;
  recipeVersionId?: string;
  displayName!: string;
  variantLabel?: string | null;
  recipeYieldServings?: string;
  recipeIngredientNames?: readonly string[];
  matchType!: FoodEntityMatchType;
  confidence!: FoodEntityConfidence;
}

export class FoodResolutionClarificationDto {
  message!: string;
  choices!: readonly FoodResolutionCandidateDto[];
}

export class FoodResolutionDto {
  status!: FoodEntityResolutionStatus;
  query!: string;
  candidates!: readonly FoodResolutionCandidateDto[];
  clarification?: FoodResolutionClarificationDto;
}
