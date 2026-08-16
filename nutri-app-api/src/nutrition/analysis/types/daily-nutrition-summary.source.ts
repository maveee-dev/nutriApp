import { NutritionTotal } from './nutrition-total.type.js';
import { NutritionInsightSource } from '../sources/nutrition-insight.source.js';
import { NutritionPolicyDeferralSource } from './nutrition-targets.type.js';
import { NutritionTargets } from './nutrition-targets.type.js';

export interface DailyNutritionSummarySource {
  readonly date: string;
  readonly mealCount: number;
  readonly totals: readonly NutritionTotal[];
  readonly targets: NutritionTargets;
  readonly insights: readonly NutritionInsightSource[];
  readonly deferredPolicies: readonly NutritionPolicyDeferralSource[];
}

export interface WeeklyNutritionSummarySource {
  readonly startDate: string;
  readonly endDate: string;
  readonly days: readonly DailyNutritionSummarySource[];
}
