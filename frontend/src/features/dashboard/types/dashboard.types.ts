export interface NutritionTotal {
  name: string;
  unit: string;
  amount: string;
}

export interface NutritionTargets {
  sodiumMilligrams: string;
  proteinGrams: string | null;
  saturatedFatGrams?: string | null;
  addedSugarGrams?: string | null;
  cholesterolMilligrams?: string | null;
  fiberGrams?: string | null;
  carbohydrateGrams?: string | null;
  potassiumMilligrams?: string | null;
  caloriesKcal?: string | null;
}

export interface NutritionTargetProvenance {
  target: string;
  policyId: string;
  source: string;
  version: string;
  explanation: string;
  applicability?: {
    context: string;
    conditionCode: string;
    dialysisStatus: string | null;
    laboratory?: { testCode: string; value: string; unit: string; collectedAt: string };
  };
  sourceUrl?: string;
  sourceVersion?: string;
  guideline?: { name: string; edition: string; url: string };
  evidence?: { approvalSource: string; sourceReference: string | null; approvedAt: string; expiresAt: string | null };
  supportingSource?: { name: string; version: string; url: string };
}

export interface DiabetesCarbohydrateAdherence {
  status: string;
  targetCarbohydrateGrams: string | null;
  consumedCarbohydrateGrams: string | null;
  remainingCarbohydrateGrams: string | null;
  exceededByGrams: string | null;
  coveragePercentage: number | null;
  targetProvenance?: NutritionTargetProvenance | null;
  snapshotIds: string[];
  deferredPolicy?: NutritionPolicyDeferral;
}

export interface NutritionInsight {
  ruleId: string;
  severity: string;
  measuredValue: string;
  targetValue: string;
  explanation: string;
  policyId?: string;
  policyVersion?: string;
  provenance?: NutritionTargetProvenance;
  evaluatorVersion?: string;
  snapshotId?: string;
}

export interface NutritionPolicyDeferral {
  policyId: string;
  reason: string;
  explanation: string;
}

export interface DailyNutritionResponse {
  date: string;
  mealCount: number;
  totals: NutritionTotal[];
  targets: NutritionTargets;
  insights: NutritionInsight[];
  deferredPolicies: NutritionPolicyDeferral[];
  caloriesConsumedKcal?: string | null;
  remainingCaloriesKcal?: string | null;
  calorieTargetPercentage?: number | null;
  targetProvenance?: NutritionTargetProvenance[];
  diabetesCarbohydrateAdherence?: DiabetesCarbohydrateAdherence;
  evaluationMode?: 'current-recomputation' | 'historical-replay';
  snapshotIds?: string[];
  policySetFingerprints?: string[];
}

export interface RecommendationEvidenceSource {
  sourceType: string;
  sourceId: string;
  version?: string;
  evaluatorVersion?: string;
  policyVersion?: string;
  snapshotVersion?: string;
  evaluatedAt?: string;
}

export interface RecommendationEvidence {
  id: string;
  kind: string;
  source: RecommendationEvidenceSource;
  field: string;
  value: string | number | boolean | null;
  unit?: string;
  explanation: string;
  limitation?: string;
}

export interface RecommendationItem {
  id: string;
  category: string;
  disposition: string;
  severity: string;
  scope: string;
  title: string;
  message: string;
  nutrient?: string;
  evidence: RecommendationEvidence[];
  policy: { policyId: string; version: string; source?: string };
  limitations?: string[];
  actions?: string[];
}

export interface RecommendationSuppression {
  candidateId: string;
  reason: string;
  comparedWith?: string;
}

export interface RecommendationResolution {
  apiVersion: string;
  scope: string;
  contextId: string;
  asOf: string;
  recommendations: RecommendationItem[];
  suppressed: RecommendationSuppression[];
}
