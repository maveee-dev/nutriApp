export type RecommendationEvidenceKind =
  | 'evaluation'
  | 'target'
  | 'snapshot'
  | 'summary'
  | 'policy-deferral'
  | 'source-data'
  | 'policy'
  | (string & {});

export interface RecommendationEvidenceSource {
  readonly sourceType:
    | 'food-evaluation'
    | 'nutrition-policy'
    | 'meal-evaluation-snapshot'
    | 'daily-summary'
    | 'weekly-summary'
    | 'historical-summary'
    | 'profile'
    | 'condition'
    | 'laboratory-result'
    | 'medication'
    | 'food-knowledge'
    | (string & {});
  readonly sourceId: string;
  readonly version?: string;
  readonly evaluatorVersion?: string;
  readonly policyVersion?: string;
  readonly policySetFingerprint?: string;
  readonly snapshotFingerprint?: string;
  readonly snapshotVersion?: string;
  readonly evaluatedAt?: string;
}

export interface RecommendationEvidence {
  readonly id: string;
  readonly kind: RecommendationEvidenceKind;
  readonly source: RecommendationEvidenceSource;
  readonly field: string;
  readonly value: string | number | boolean | null;
  readonly unit?: string;
  readonly explanation: string;
  readonly limitation?: string;
}
