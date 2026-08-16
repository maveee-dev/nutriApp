export type NutritionInsightSeverity = 'warning';

export interface NutritionInsightSource {
  readonly ruleId: string;
  readonly severity: NutritionInsightSeverity;
  readonly measuredValue: string;
  readonly targetValue: string;
  readonly explanation: string;
}
