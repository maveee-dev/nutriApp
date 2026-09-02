export interface FoodEvaluationRequest {
  foodId: string;
  servingId: string;
  quantity: string;
}

export interface FoodEvaluationReason {
  code: string;
  direction: 'positive' | 'negative' | 'neutral';
  nutrient: string;
  measuredValue: string;
  targetValue: string | null;
  explanation: string;
}

export interface FoodEvaluationContribution {
  nutrient: string;
  unit?: string;
  amount: string;
  targetValue: string | null;
  currentDailyValue: string | null;
  explanation: string;
}

export interface FoodNutritionInsight {
  category: 'potassium' | 'phosphorus' | 'sodium' | 'fiber';
  severity: 'information' | 'positive';
  title: string;
  message: string;
  evidence: {
    nutrient: string;
    amount: string;
    unit: string;
  };
}

export interface FoodEvaluationResponse {
  score: number;
  evaluationStatus?: 'evaluated' | 'insufficient-evidence';
  coverage: number;
  reasons: FoodEvaluationReason[];
  contributions: FoodEvaluationContribution[];
  deferredPolicies: { policyId: string; reason: string; explanation: string }[];
  nutritionInsights?: FoodNutritionInsight[];
  evaluatorVersion?: string;
  policySetFingerprint?: string | null;
  snapshotVersion?: string;
}
