import { NutritionTargetProvenance } from '../types/nutrition-targets.type.js';

export type NutritionInsightSeverity = 'warning';

export interface NutritionInsightSource {
  readonly ruleId: string;
  readonly severity: NutritionInsightSeverity;
  readonly measuredValue: string;
  readonly targetValue: string;
  readonly explanation: string;
  readonly policyId?: string;
  readonly policyVersion?: string;
  readonly provenance?: NutritionTargetProvenance;
  readonly evaluatorVersion?: string;
  readonly snapshotId?: string;
}
