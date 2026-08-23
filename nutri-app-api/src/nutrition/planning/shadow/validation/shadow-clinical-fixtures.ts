export interface ShadowClinicalFixture {
  readonly id: string;
  readonly description: string;
  readonly conditionCodes: readonly string[];
  readonly evidenceProfile: string;
  readonly expectedPolicyIds: readonly string[];
  readonly expectedDeferredPolicyIds: readonly string[];
  readonly unsupportedConditionCodes: readonly string[];
}

export const SHADOW_CLINICAL_FIXTURES: readonly ShadowClinicalFixture[] = [
  {
    id: 'healthy-adult', description: 'Healthy adult with current general-nutrition evidence', conditionCodes: [], evidenceProfile: 'general-current',
    expectedPolicyIds: ['general-nutrition-sodium-v1', 'general-nutrition-protein-v1'], expectedDeferredPolicyIds: [], unsupportedConditionCodes: [],
  },
  {
    id: 'diabetes', description: 'Diabetes with an approved individualized carbohydrate target', conditionCodes: ['diabetes'], evidenceProfile: 'diabetes-target-current',
    expectedPolicyIds: ['diabetes-carbohydrate-target-v1'], expectedDeferredPolicyIds: [], unsupportedConditionCodes: [],
  },
  {
    id: 'hypertension', description: 'Hypertension with general and cardiovascular sodium guidance', conditionCodes: ['hypertension'], evidenceProfile: 'cardiovascular-current',
    expectedPolicyIds: ['cardiovascular-sodium-v1'], expectedDeferredPolicyIds: [], unsupportedConditionCodes: [],
  },
  {
    id: 'ckd-stage-3', description: 'Non-dialysis CKD Stage 3 with fresh eGFR and inactive dialysis status', conditionCodes: ['ckd'], evidenceProfile: 'ckd-stage-3-current',
    expectedPolicyIds: ['ckd-non-dialysis-protein-v1'], expectedDeferredPolicyIds: [], unsupportedConditionCodes: [],
  },
  {
    id: 'ckd-stage-5', description: 'CKD Stage 5 without dialysis status, exercising non-dialysis applicability boundaries', conditionCodes: ['ckd'], evidenceProfile: 'ckd-stage-5-current-non-dialysis',
    expectedPolicyIds: ['ckd-non-dialysis-protein-v1'], expectedDeferredPolicyIds: [], unsupportedConditionCodes: [],
  },
  {
    id: 'dialysis', description: 'Active hemodialysis with explicit fresh modality evidence', conditionCodes: ['ckd'], evidenceProfile: 'hemodialysis-current',
    expectedPolicyIds: ['hemodialysis-protein-v1'], expectedDeferredPolicyIds: [], unsupportedConditionCodes: [],
  },
  {
    id: 'peritoneal-dialysis', description: 'Active peritoneal dialysis with explicit fresh modality evidence', conditionCodes: ['ckd'], evidenceProfile: 'peritoneal-dialysis-current',
    expectedPolicyIds: ['peritoneal-dialysis-protein-v1'], expectedDeferredPolicyIds: [], unsupportedConditionCodes: [],
  },
  {
    id: 'diabetes-ckd', description: 'Diabetes and CKD with both evidence slices current', conditionCodes: ['diabetes', 'ckd'], evidenceProfile: 'diabetes-and-ckd-current',
    expectedPolicyIds: ['diabetes-carbohydrate-target-v1', 'ckd-non-dialysis-protein-v1'], expectedDeferredPolicyIds: [], unsupportedConditionCodes: [],
  },
  {
    id: 'ckd-hypertension', description: 'CKD and hypertension with renal and cardiovascular policy interaction', conditionCodes: ['ckd', 'hypertension'], evidenceProfile: 'ckd-and-cardiovascular-current',
    expectedPolicyIds: ['ckd-non-dialysis-protein-v1', 'cardiovascular-sodium-v1'], expectedDeferredPolicyIds: [], unsupportedConditionCodes: [],
  },
  {
    id: 'diabetes-ckd-hypertension', description: 'Diabetes, CKD, and hypertension with all supported evidence slices current', conditionCodes: ['diabetes', 'ckd', 'hypertension'], evidenceProfile: 'diabetes-ckd-cardiovascular-current',
    expectedPolicyIds: ['diabetes-carbohydrate-target-v1', 'ckd-non-dialysis-protein-v1', 'cardiovascular-sodium-v1'], expectedDeferredPolicyIds: [], unsupportedConditionCodes: [],
  },
  {
    id: 'diabetes-missing-target', description: 'Diabetes without an approved individualized carbohydrate target', conditionCodes: ['diabetes'], evidenceProfile: 'diabetes-target-missing',
    expectedPolicyIds: [], expectedDeferredPolicyIds: ['diabetes-carbohydrate-target-v1'], unsupportedConditionCodes: [],
  },
  {
    id: 'ckd-missing-egfr', description: 'Non-dialysis CKD without usable eGFR evidence', conditionCodes: ['ckd'], evidenceProfile: 'ckd-egfr-missing',
    expectedPolicyIds: [], expectedDeferredPolicyIds: ['ckd-non-dialysis-protein-v1'], unsupportedConditionCodes: [],
  },
  {
    id: 'ckd-stale-egfr', description: 'Non-dialysis CKD with eGFR evidence outside the freshness window', conditionCodes: ['ckd'], evidenceProfile: 'ckd-egfr-stale',
    expectedPolicyIds: [], expectedDeferredPolicyIds: ['ckd-non-dialysis-protein-v1'], unsupportedConditionCodes: [],
  },
  {
    id: 'dialysis-conflicting-modality', description: 'Active dialysis with conflicting modality evidence', conditionCodes: ['ckd'], evidenceProfile: 'dialysis-modality-conflicting',
    expectedPolicyIds: [], expectedDeferredPolicyIds: ['ckd-non-dialysis-protein-v1', 'hemodialysis-protein-v1'], unsupportedConditionCodes: [],
  },
  {
    id: 'hyperlipidemia', description: 'Hyperlipidemia, which is not currently owned by an approved policy group', conditionCodes: ['hyperlipidemia'], evidenceProfile: 'general-only-unsupported-condition',
    expectedPolicyIds: [], expectedDeferredPolicyIds: [], unsupportedConditionCodes: ['hyperlipidemia'],
  },
  {
    id: 'anemia-ckd', description: 'Anemia with CKD; CKD is supported while anemia-specific guidance is not', conditionCodes: ['anemia', 'ckd'], evidenceProfile: 'ckd-current-anemia-unsupported',
    expectedPolicyIds: ['ckd-non-dialysis-protein-v1'], expectedDeferredPolicyIds: [], unsupportedConditionCodes: ['anemia'],
  },
];
