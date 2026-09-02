export class FoodRecognitionNutritionEstimateDto {
  nutrient!: string;
  amount!: string;
  unit!: string;
  basis!: string;
}

export class FoodRecognitionCandidateDto {
  label!: string;
  confidence!: number;
  foodId!: string | null;
  foodName!: string | null;
  foodDisplayName!: string | null;
  foodVariantLabel!: string | null;
  matchStatus!: 'database-match' | 'ambiguous' | 'ai-estimate' | 'unmatched';
  resolutionStatus!: 'matched' | 'ambiguous' | 'unmatched';
  nutritionSource!: 'canonical-database' | 'ai-estimated' | null;
  requiresReview!: boolean;
  /** @deprecated Retained for response compatibility; MVP recognition never populates AI nutrient estimates. */
  estimatedNutrition?: readonly FoodRecognitionNutritionEstimateDto[];
  alternatives?: readonly FoodRecognitionAlternativeDto[];
  servingSuggestion?: FoodRecognitionServingSuggestionDto;
}

export class FoodRecognitionAlternativeDto {
  foodId!: string;
  displayName!: string;
  variantLabel!: string | null;
  canonicalName!: string | null;
}

export class FoodRecognitionServingSuggestionDto {
  label!: string;
  grams!: string | null;
}

export class FoodRecognitionResponseDto {
  apiVersion!: string;
  providerId!: string;
  providerAvailable!: boolean;
  recognitionStatus!: 'completed' | 'unavailable';
  imageQuality!: {
    status: 'good' | 'needs-review' | 'poor' | 'unavailable';
    issues: readonly string[];
  };
  mealConfidence!: number | null;
  mealDescription!: string | null;
  candidates!: readonly FoodRecognitionCandidateDto[];
  limitations!: readonly string[];
}
