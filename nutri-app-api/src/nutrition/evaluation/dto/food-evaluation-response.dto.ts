export class FoodEvaluationReasonDto {
  code!: string;
  direction!: string;
  nutrient!: string;
  measuredValue!: string;
  targetValue!: string | null;
  explanation!: string;
}

export class FoodEvaluationResponseDto {
  score!: number;
  reasons!: FoodEvaluationReasonDto[];
  deferredPolicies!: { policyId: string; reason: string; explanation: string }[];
}
