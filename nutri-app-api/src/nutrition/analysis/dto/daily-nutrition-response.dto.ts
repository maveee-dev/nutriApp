export class NutritionTotalDto {
  name!: string;
  unit!: string;
  amount!: string;
}

export class DailyNutritionResponseDto {
  date!: string;
  mealCount!: number;
  totals!: NutritionTotalDto[];
  targets!: NutritionTargetsDto;
  insights!: NutritionInsightDto[];
  deferredPolicies!: NutritionPolicyDeferralDto[];
}

export class NutritionTargetsDto {
  sodiumMilligrams!: string;
  proteinGrams!: string | null;
}

export class NutritionPolicyDeferralDto {
  policyId!: string;
  reason!: string;
  explanation!: string;
}

export class WeeklyNutritionResponseDto {
  startDate!: string;
  endDate!: string;
  days!: DailyNutritionResponseDto[];
}

export class NutritionInsightDto {
  ruleId!: string;
  severity!: string;
  measuredValue!: string;
  targetValue!: string;
  explanation!: string;
}
