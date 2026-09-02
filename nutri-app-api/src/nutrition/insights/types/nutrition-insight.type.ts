export type NutritionInsightCategory = 'potassium' | 'phosphorus' | 'sodium' | 'fiber';

export type NutritionInsightSeverity = 'information' | 'positive';

export interface NutritionInsightEvidence {
  readonly nutrient: NutritionInsightCategory;
  readonly amount: string;
  readonly unit: string;
}

/**
 * Educational context projected from an existing food evaluation.
 *
 * This is deliberately not a compatibility result. It carries no target,
 * score, weight, or policy decision and therefore cannot affect evaluation.
 */
export interface NutritionInsight {
  readonly category: NutritionInsightCategory;
  readonly severity: NutritionInsightSeverity;
  readonly title: string;
  readonly message: string;
  readonly evidence: NutritionInsightEvidence;
}

