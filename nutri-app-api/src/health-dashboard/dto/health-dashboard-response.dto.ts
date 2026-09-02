export class HealthDashboardGreetingDto {
  greeting!: string;
  displayName!: string;
  date!: string;
  profileSummary!: HealthDashboardProfileSummaryDto;
}

export class HealthDashboardProfileSummaryDto {
  conditions!: string[];
  dialysis!: string | null;
}

export class HealthDashboardNutrientProgressDto {
  nutrient!: string;
  consumed!: string;
  target!: string | null;
  remaining!: string | null;
  unit!: string;
  targetConfigured!: boolean;
  percentageConsumed!: number | null;
  status!: string;
}

export class HealthDashboardInsightDto {
  category!: string;
  severity!: string;
  title!: string;
  message!: string;
  source!: 'nutrition-insight' | 'laboratory' | 'deferred-policy' | 'target-configuration';
}

export class HealthDashboardNutritionInsightDto {
  ruleId!: string;
  severity!: string;
  measuredValue!: string;
  targetValue!: string;
  explanation!: string;
  policyId?: string;
  policyVersion?: string;
  evaluatorVersion?: string;
  snapshotId?: string;
}

export class HealthDashboardLaboratoryResultDto {
  id!: string;
  reportId!: string | null;
  testCode!: string;
  testName!: string;
  value!: string;
  unit!: string;
  referenceLow!: string | null;
  referenceHigh!: string | null;
  flag!: string | null;
  status!: 'low' | 'normal' | 'high' | 'unknown';
  message!: string;
  reportDate!: string;
}

export class HealthDashboardLaboratoryTrendPointDto {
  resultId!: string;
  reportDate!: string;
  value!: string;
  unit!: string;
  status!: 'low' | 'normal' | 'high' | 'unknown';
}

export class HealthDashboardLaboratoryTrendDto {
  testCode!: string;
  testName!: string;
  direction!: 'improving' | 'worsening' | 'stable' | 'insufficient-history';
  latest!: HealthDashboardLaboratoryTrendPointDto;
  previous!: HealthDashboardLaboratoryTrendPointDto | null;
  points!: HealthDashboardLaboratoryTrendPointDto[];
}

export class HealthDashboardLaboratorySummaryDto {
  latestReport!: HealthDashboardLaboratoryReportSummaryDto | null;
  results!: HealthDashboardLaboratoryResultDto[];
  importantResults!: HealthDashboardLaboratoryResultDto[];
  trends!: HealthDashboardLaboratoryTrendDto[];
  insights!: HealthDashboardInsightDto[];
}

export class HealthDashboardLaboratoryReportSummaryDto {
  id!: string;
  reportDate!: string;
  source!: string;
  createdAt!: string;
}

export class HealthDashboardBudgetItemDto {
  current!: string | null;
  target!: string | null;
  remaining!: string | null;
  unit!: string;
  status!: string;
}

export class HealthDashboardRecommendedFoodDto {
  foodId!: string;
  displayName!: string;
  variantLabel!: string | null;
  servingId!: string;
  servingName!: string;
  servingGrams!: string;
  quantity!: string;
  score!: number;
  coverage!: number;
  evaluationStatus!: 'evaluated' | 'insufficient-evidence';
  keyNutrients!: { nutrient: string; amount: string; unit: string }[];
}

export class HealthDashboardMealPlannerDto {
  recommendation!: HealthDashboardRecommendationDto | null;
  remainingMeals!: number | null;
}

export class HealthDashboardRecommendationDto {
  date!: string;
  mealType!: string;
  focus!: string;
  foods!: HealthDashboardRecommendedFoodDto[];
  summary!: Record<string, HealthDashboardNutrientAmountDto>;
  remainingBudget!: Record<string, HealthDashboardBudgetItemDto>;
  limitations!: string[];
}

export class HealthDashboardNutrientAmountDto {
  amount!: string;
  unit!: string;
}

export class HealthDashboardDailyFoodDto {
  id!: string;
  foodId!: string | null;
  servingId!: string | null;
  recipeId!: string | null;
  recipeVersionId!: string | null;
  displayName!: string;
  variantLabel!: string | null;
  servingName!: string;
  servingGrams!: string;
  quantity!: string;
  compatibilityScore!: number | null;
  evaluationStatus!: 'evaluated' | 'insufficient-evidence' | 'not-available';
}

export class HealthDashboardCompatibilitySummaryDto {
  averageScore!: number | null;
  evaluated!: number;
  partiallyEvaluated!: number;
  insufficientEvidence!: number;
}

export class HealthDashboardRecipeCardDto {
  recipeId!: string;
  recipeVersionId!: string;
  name!: string;
  isFavorite!: boolean;
  updatedAt!: string;
  compatibilityScore!: number | null;
  coverage!: number | null;
}

export class HealthDashboardRecipeSummaryDto {
  recent!: HealthDashboardRecipeCardDto[];
  favorites!: HealthDashboardRecipeCardDto[];
  today!: HealthDashboardRecipeCardDto[];
  recentEvaluated!: HealthDashboardRecipeCardDto[];
}

export class HealthDashboardResponseDto {
  greeting!: HealthDashboardGreetingDto;
  nutritionProgress!: HealthDashboardNutrientProgressDto[];
  nutritionInsights!: HealthDashboardNutritionInsightDto[];
  laboratorySummary!: HealthDashboardLaboratorySummaryDto;
  mealPlanner!: HealthDashboardMealPlannerDto;
  dailyFoods!: HealthDashboardDailyFoodDto[];
  compatibilitySummary!: HealthDashboardCompatibilitySummaryDto;
  healthNotices!: HealthDashboardInsightDto[];
  recipeSummary?: HealthDashboardRecipeSummaryDto;
}
