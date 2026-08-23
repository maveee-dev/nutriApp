import { CONDITION_CODES } from '../../../../conditions/types/condition-code.js';
import { Decimal } from 'decimal.js';
import { EgfrEvidenceFailureReason } from '../../../../laboratory/sources/egfr-evidence-resolution.source.js';
import { LaboratoryFindingSource } from '../../../../laboratory/sources/laboratory-finding.source.js';
import { IndividualizedNutritionTargetEvidence } from '../../types/individualized-nutrition-target-evidence.type.js';
import { DialysisStatusContext } from '../../types/nutrition-evaluation-context.type.js';
import { NutritionPolicyDeferralSource, NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';

export const CKD_PHOSPHORUS_POLICY_ID = 'ckd-phosphorus-v1';
export const CKD_PHOSPHORUS_POLICY_VERSION = 'v1';
export const CKD_PHOSPHORUS_EVIDENCE_MAX_AGE_DAYS = 365;

const KDOQI_SOURCE = 'KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update';
const KDOQI_SOURCE_VERSION = '2020-08-20';
const KDOQI_SOURCE_URL = 'https://www.kidney.org/professionals/kdoqi/guidelines-and-commentaries/nutrition-ckd';
const KDIGO_SOURCE = 'KDIGO 2017 Clinical Practice Guideline Update for CKD-MBD';
const KDIGO_SOURCE_VERSION = '2017-06-22';
const KDIGO_SOURCE_URL = 'https://kdigo.org/guidelines/ckd-mbd/kdigo_ckd_mbd_guideline_r6/';

export interface CkdPhosphorusPolicyResult {
  readonly phosphorusMilligrams: string | null;
  readonly provenance: NutritionTargetProvenance | null;
  readonly deferredPolicy: NutritionPolicyDeferralSource | null;
}

/** Applies only an approved individualized phosphorus upper limit for CKD. */
export class CkdPhosphorusPolicy {
  calculate(
    conditionCodes: readonly string[],
    target: IndividualizedNutritionTargetEvidence | null,
    phosphorusFinding: LaboratoryFindingSource | null,
    egfrFinding: LaboratoryFindingSource | null,
    dialysisStatus: DialysisStatusContext | null,
    asOf: Date = new Date(),
    egfrFailureReason: EgfrEvidenceFailureReason | null = null,
    egfrFailureExplanation: string | null = null,
    phosphorusFailureReason: string | null = null,
    phosphorusFailureExplanation: string | null = null,
  ): CkdPhosphorusPolicyResult {
    if (!conditionCodes.includes(CONDITION_CODES.CKD)) return this.empty();
    if (dialysisStatus === 'ACTIVE') {
      // Dialysis is within the CKD G5D scope without requiring a separate eGFR.
    } else {
      if (dialysisStatus == null) {
        return this.defer('missing-dialysis-status', 'Dialysis status is required to determine whether the CKD phosphorus policy applies to a dialysis or non-dialysis context.');
      }
      if (egfrFinding == null) {
        return this.defer(egfrFailureReason === 'invalid-egfr-unit' ? 'invalid-egfr-unit' : egfrFailureReason === 'invalid-egfr-value' ? 'invalid-egfr-value' : 'missing-egfr', egfrFailureExplanation ?? 'A current eGFR result is required to confirm CKD G3a–G5 scope for phosphorus guidance.');
      }
      if (!this.isFresh(egfrFinding, asOf)) {
        return this.defer('stale-egfr', 'The eGFR result is older than the approved evidence window for CKD phosphorus applicability.');
      }
      if (!this.isSupportedEgfr(egfrFinding.value)) return this.empty();
    }
    if (target == null || target.nutrientKey !== 'phosphorusMilligrams') {
      return this.defer('missing-individualized-phosphorus-target', 'An approved individualized phosphorus limit is required before CKD-specific phosphorus guidance can be applied.');
    }
    if (target.kind !== 'upper-limit') {
      return this.defer('unsupported-phosphorus-target-kind', 'The available individualized phosphorus evidence is not an approved upper limit.');
    }
    if (target.expiresAt != null && target.expiresAt <= asOf) {
      return this.defer('expired-individualized-phosphorus-target', 'The approved individualized phosphorus limit has expired and must be reviewed before CKD-specific guidance can continue.');
    }
    if (target.unit.trim().toLowerCase() !== 'mg/day') {
      return this.defer('invalid-phosphorus-target-unit', 'The individualized phosphorus limit must be expressed in mg/day.');
    }
    const targetValue = Number(target.targetValue);
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      return this.defer('invalid-phosphorus-target-value', 'The individualized phosphorus limit must be a positive numeric value.');
    }
    if (phosphorusFinding == null) {
      const reason = phosphorusFailureReason === 'invalid-phosphorus-unit'
        ? 'invalid-phosphorus-unit'
        : phosphorusFailureReason === 'invalid-phosphorus-value'
          ? 'invalid-phosphorus-value'
          : 'missing-phosphorus';
      return this.defer(reason, phosphorusFailureExplanation ?? 'A current serum phosphorus result is required to apply the individualized CKD phosphorus limit.');
    }
    if (!this.isFresh(phosphorusFinding, asOf)) {
      return this.defer('stale-phosphorus', `The serum phosphorus result is older than the approved ${CKD_PHOSPHORUS_EVIDENCE_MAX_AGE_DAYS}-day evidence window.`);
    }

    const provenance: NutritionTargetProvenance = {
      target: 'phosphorusMilligrams',
      policyId: CKD_PHOSPHORUS_POLICY_ID,
      source: KDOQI_SOURCE,
      sourceUrl: KDOQI_SOURCE_URL,
      sourceVersion: KDOQI_SOURCE_VERSION,
      guideline: { name: KDOQI_SOURCE, edition: '2020 Update', url: KDOQI_SOURCE_URL },
      applicability: {
        context: 'ckd-individualized-phosphorus',
        conditionCode: CONDITION_CODES.CKD,
        dialysisStatus,
        laboratory: {
          testCode: phosphorusFinding.testCode,
          value: phosphorusFinding.value,
          unit: phosphorusFinding.unit,
          collectedAt: phosphorusFinding.collectedAt.toISOString(),
        },
        supportingSource: { name: KDIGO_SOURCE, version: KDIGO_SOURCE_VERSION, url: KDIGO_SOURCE_URL },
      },
      evidence: {
        evidenceId: target.id,
        evidenceVersion: target.version,
        approvalSource: target.approvalSource,
        sourceReference: target.sourceReference,
        effectiveAt: target.effectiveAt.toISOString(),
        approvedAt: target.approvedAt.toISOString(),
        expiresAt: target.expiresAt?.toISOString() ?? null,
      },
      version: CKD_PHOSPHORUS_POLICY_VERSION,
      explanation: `This individualized phosphorus limit of ${target.targetValue} mg/day was supplied through an approved numeric target record and is applicable with current serum phosphorus evidence. NutriApp does not infer a dietary phosphorus target from a serum result or apply a universal CKD restriction.`,
    };
    return { phosphorusMilligrams: target.targetValue, provenance, deferredPolicy: null };
  }

  private isFresh(finding: LaboratoryFindingSource, asOf: Date): boolean {
    const ageMs = asOf.getTime() - finding.collectedAt.getTime();
    return ageMs >= 0 && ageMs <= CKD_PHOSPHORUS_EVIDENCE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  }

  private isSupportedEgfr(value: string): boolean {
    try {
      const egfr = new Decimal(value);
      return egfr.gt(0) && egfr.lt(60);
    } catch {
      return false;
    }
  }

  private defer(reason: string, explanation: string): CkdPhosphorusPolicyResult {
    return { phosphorusMilligrams: null, provenance: null, deferredPolicy: { policyId: CKD_PHOSPHORUS_POLICY_ID, reason, explanation } };
  }

  private empty(): CkdPhosphorusPolicyResult {
    return { phosphorusMilligrams: null, provenance: null, deferredPolicy: null };
  }
}
