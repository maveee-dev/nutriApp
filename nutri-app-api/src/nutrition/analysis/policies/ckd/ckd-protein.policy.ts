import { Decimal } from 'decimal.js';
import { CONDITION_CODES } from '../../../../conditions/types/condition-code.js';
import { ProfileSource } from '../../../../profiles/sources/profile.source.js';
import { LaboratoryFindingSource } from '../../../../laboratory/sources/laboratory-finding.source.js';
import { NutritionPolicyDeferralSource, NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';
import { DialysisStatusContext } from '../../types/nutrition-evaluation-context.type.js';
import { EgfrEvidenceFailureReason } from '../../../../laboratory/sources/egfr-evidence-resolution.source.js';

export const CKD_NON_DIALYSIS_PROTEIN_POLICY_ID = 'ckd-non-dialysis-protein-v1';
export const CKD_NON_DIALYSIS_PROTEIN_POLICY_VERSION = 'v1';
export const CKD_EGFR_MAX_AGE_DAYS = 365;

const KDIGO_SOURCE = 'KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of CKD';
const KDIGO_SOURCE_VERSION = '2024-03-13';
const KDIGO_SOURCE_URL = 'https://kdigo.org/guidelines/ckd-evaluation-and-management/kdigo-2024-ckd-guideline/';
const KDOQI_SOURCE = 'KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update';
const KDOQI_SOURCE_VERSION = '2020-08-20';
const KDOQI_SOURCE_URL = 'https://www.kidney.org/professionals/kdoqi/guidelines-and-commentaries/nutrition-ckd';

export interface CkdProteinPolicyResult {
  readonly proteinGrams: string | null;
  readonly provenance: NutritionTargetProvenance | null;
  readonly deferredPolicy: NutritionPolicyDeferralSource | null;
}

/** Owns only non-dialysis CKD protein applicability; dialysis targets remain separate policies. */
export class CkdProteinPolicy {
  calculate(
    profile: Pick<ProfileSource, 'weightKg'> | null,
    conditionCodes: readonly string[],
    egfrFinding: LaboratoryFindingSource | null,
    dialysisStatus: DialysisStatusContext | null,
    baselineProteinGrams: string | null,
    asOf: Date = new Date(),
    egfrFailureReason: EgfrEvidenceFailureReason | null = null,
    egfrFailureExplanation: string | null = null,
  ): CkdProteinPolicyResult {
    if (!conditionCodes.includes(CONDITION_CODES.CKD)) {
      return this.empty();
    }
    if (profile?.weightKg == null || baselineProteinGrams == null) {
      return this.defer('missing-weight', 'A current body weight is needed to personalize non-dialysis CKD protein guidance.');
    }
    if (dialysisStatus === 'ACTIVE') {
      return this.defer('dialysis-policy-pending', 'Dialysis-specific protein guidance is owned by a separate policy and is not yet applied.');
    }
    if (dialysisStatus == null) {
      return this.defer('missing-dialysis-status', 'Dialysis status is required to distinguish non-dialysis CKD from dialysis contexts.');
    }
    if (egfrFinding == null) {
      return this.defer(egfrFailureReason === 'invalid-egfr-unit' ? 'invalid-egfr-unit' : egfrFailureReason === 'invalid-egfr-value' ? 'invalid-egfr-value' : 'missing-egfr', egfrFailureExplanation ?? 'A current eGFR result is required for non-dialysis CKD protein guidance.');
    }
    if (!this.isFresh(egfrFinding, asOf)) {
      return this.defer('stale-egfr', `The eGFR result is older than the approved ${CKD_EGFR_MAX_AGE_DAYS}-day evidence window.`);
    }
    if (!this.isSupportedEgfr(egfrFinding.value)) {
      return this.defer('unsupported-egfr', 'The available eGFR result does not meet the approved non-dialysis CKD protein policy scope.');
    }

    return {
      proteinGrams: baselineProteinGrams,
      deferredPolicy: null,
      provenance: {
        target: 'proteinGrams',
        policyId: CKD_NON_DIALYSIS_PROTEIN_POLICY_ID,
        source: KDOQI_SOURCE,
        sourceUrl: KDOQI_SOURCE_URL,
        sourceVersion: KDOQI_SOURCE_VERSION,
        guideline: {
          name: KDOQI_SOURCE,
          edition: '2020 Update',
          url: KDOQI_SOURCE_URL,
        },
        applicability: {
          context: 'ckd-non-dialysis',
          conditionCode: CONDITION_CODES.CKD,
          dialysisStatus,
          laboratory: {
            testCode: egfrFinding.testCode,
            value: egfrFinding.value,
            unit: egfrFinding.unit,
            collectedAt: egfrFinding.collectedAt.toISOString(),
          },
          supportingSource: {
            name: KDIGO_SOURCE,
            version: KDIGO_SOURCE_VERSION,
            url: KDIGO_SOURCE_URL,
          },
        },
        version: CKD_NON_DIALYSIS_PROTEIN_POLICY_VERSION,
        explanation: `The non-dialysis CKD policy confirms the existing ${baselineProteinGrams} g/day protein baseline for a supported CKD context with current eGFR evidence. This policy does not apply dialysis-specific guidance.`,
      },
    };
  }

  private isFresh(finding: LaboratoryFindingSource, asOf: Date): boolean {
    const ageMs = asOf.getTime() - finding.collectedAt.getTime();
    return ageMs >= 0 && ageMs <= CKD_EGFR_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  }

  private isSupportedEgfr(value: string): boolean {
    try {
      const egfr = new Decimal(value);
      return egfr.gt(0) && egfr.lt(60);
    } catch {
      return false;
    }
  }

  private defer(reason: string, explanation: string): CkdProteinPolicyResult {
    return {
      proteinGrams: null,
      provenance: null,
      deferredPolicy: {
        policyId: CKD_NON_DIALYSIS_PROTEIN_POLICY_ID,
        reason,
        explanation,
      },
    };
  }

  private empty(): CkdProteinPolicyResult {
    return { proteinGrams: null, provenance: null, deferredPolicy: null };
  }
}
