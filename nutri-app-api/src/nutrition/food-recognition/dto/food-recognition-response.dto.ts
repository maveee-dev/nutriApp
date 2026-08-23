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
  matchStatus!: 'database-match' | 'ai-estimate' | 'unmatched';
  nutritionSource!: 'canonical-database' | 'ai-estimated' | null;
  requiresReview!: boolean;
  estimatedNutrition?: readonly FoodRecognitionNutritionEstimateDto[];
}

export class FoodRecognitionResponseDto {
  apiVersion!: string;
  providerId!: string;
  providerAvailable!: boolean;
  candidates!: readonly FoodRecognitionCandidateDto[];
  limitations!: readonly string[];
}
