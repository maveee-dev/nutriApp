export class FoodEvaluationReasonDto {
  code!: string;
  direction!: string;
  nutrient!: string;
  measuredValue!: string;
  targetValue!: string | null;
  explanation!: string;
}

export class FoodEvaluationContributionDto {
  nutrient!: string;
  amount!: string;
  targetValue!: string | null;
  currentDailyValue!: string | null;
  explanation!: string;
}

export class FoodEvaluationResponseDto {
  score!: number;
  evaluationStatus!: 'evaluated' | 'insufficient-evidence';
  coverage!: number;
  reasons!: FoodEvaluationReasonDto[];
  contributions!: FoodEvaluationContributionDto[];
  deferredPolicies!: { policyId: string; reason: string; explanation: string }[];
}
