export interface HealthDashboardGreeting {
  greeting: string;
  displayName: string;
  date: string;
  profileSummary: { conditions: string[]; dialysis: string | null };
}

export interface HealthDashboardProgress {
  nutrient: string;
  consumed: string;
  target: string | null;
  remaining: string | null;
  unit: string;
  targetConfigured: boolean;
  percentageConsumed: number | null;
  status: string;
}

export interface HealthDashboardInsight {
  category: string;
  severity: string;
  title: string;
  message: string;
  source: 'nutrition-insight' | 'laboratory' | 'deferred-policy' | 'target-configuration';
}

export interface HealthDashboardNutritionInsight {
  ruleId: string;
  severity: string;
  measuredValue: string;
  targetValue: string;
  explanation: string;
  policyId?: string;
  policyVersion?: string;
  evaluatorVersion?: string;
  snapshotId?: string;
}

export interface HealthDashboardLaboratoryResult {
  id: string;
  reportId: string | null;
  testCode: string;
  testName: string;
  value: string;
  unit: string;
  referenceLow: string | null;
  referenceHigh: string | null;
  flag: string | null;
  status: 'low' | 'normal' | 'high' | 'unknown';
  message: string;
  reportDate: string;
}

export interface HealthDashboardLaboratoryTrendPoint {
  resultId: string;
  reportDate: string;
  value: string;
  unit: string;
  status: 'low' | 'normal' | 'high' | 'unknown';
}

export interface HealthDashboardLaboratoryTrend {
  testCode: string;
  testName: string;
  direction: 'improving' | 'worsening' | 'stable' | 'insufficient-history';
  latest: HealthDashboardLaboratoryTrendPoint;
  previous: HealthDashboardLaboratoryTrendPoint | null;
  points: HealthDashboardLaboratoryTrendPoint[];
}

export interface HealthDashboardLaboratorySummary {
  latestReport: { id: string; reportDate: string; source: string; createdAt: string } | null;
  results: HealthDashboardLaboratoryResult[];
  importantResults: HealthDashboardLaboratoryResult[];
  trends: HealthDashboardLaboratoryTrend[];
  insights: HealthDashboardInsight[];
}

export interface HealthDashboardRecommendedFood {
  foodId: string;
  displayName: string;
  variantLabel: string | null;
  servingId: string;
  servingName: string;
  servingGrams: string;
  quantity: string;
  score: number;
  coverage: number;
  evaluationStatus: 'evaluated' | 'insufficient-evidence';
  keyNutrients: { nutrient: string; amount: string; unit: string }[];
}

export interface HealthDashboardRecommendation {
  date: string;
  mealType: string;
  focus: string;
  foods: HealthDashboardRecommendedFood[];
  summary: Record<string, { amount: string; unit: string }>;
  remainingBudget: Record<string, { current: string | null; target: string | null; remaining: string | null; unit: string; status: string }>;
  limitations: string[];
}

export interface HealthDashboardMealPlanner {
  recommendation: HealthDashboardRecommendation | null;
  remainingMeals: number | null;
}

export interface HealthDashboardDailyFood {
  id: string;
  foodId: string | null;
  servingId: string | null;
  recipeId?: string;
  recipeVersionId?: string;
  displayName: string;
  variantLabel: string | null;
  servingName: string;
  servingGrams: string;
  quantity: string;
  compatibilityScore: number | null;
  evaluationStatus: 'evaluated' | 'insufficient-evidence' | 'not-available';
}

export interface HealthDashboardCompatibilitySummary {
  averageScore: number | null;
  evaluated: number;
  partiallyEvaluated: number;
  insufficientEvidence: number;
}

export interface HealthDashboardRecipeCard {
  recipeId: string;
  recipeVersionId: string;
  name: string;
  isFavorite: boolean;
  updatedAt: string;
  compatibilityScore: number | null;
  coverage: number | null;
}

export interface HealthDashboardRecipeSummary {
  recent: HealthDashboardRecipeCard[];
  favorites: HealthDashboardRecipeCard[];
  today: HealthDashboardRecipeCard[];
  recentEvaluated: HealthDashboardRecipeCard[];
}

export interface HealthDashboardResponse {
  greeting: HealthDashboardGreeting;
  nutritionProgress: HealthDashboardProgress[];
  nutritionInsights: HealthDashboardNutritionInsight[];
  laboratorySummary: HealthDashboardLaboratorySummary;
  mealPlanner: HealthDashboardMealPlanner;
  dailyFoods: HealthDashboardDailyFood[];
  compatibilitySummary: HealthDashboardCompatibilitySummary;
  healthNotices: HealthDashboardInsight[];
  recipeSummary?: HealthDashboardRecipeSummary;
}
