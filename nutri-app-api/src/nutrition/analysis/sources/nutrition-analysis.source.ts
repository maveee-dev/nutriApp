export interface NutritionAnalysisNutrientSource {
  readonly name: string;
  readonly unit: string;
  readonly amountPer100Grams: string;
}

export interface NutritionAnalysisItemSource {
  readonly id?: string;
  readonly quantity: string;
  readonly servingGrams: string;
  readonly nutrients: readonly NutritionAnalysisNutrientSource[];
}

export interface NutritionAnalysisMealSource {
  readonly id: string;
  readonly consumedAt: Date;
  readonly items: readonly NutritionAnalysisItemSource[];
}
