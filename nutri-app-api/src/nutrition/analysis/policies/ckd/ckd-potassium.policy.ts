import { CONDITION_CODES } from '../../../../conditions/types/condition-code.js';
import { Decimal } from 'decimal.js';
import { LaboratoryFindingSource } from '../../../../laboratory/sources/laboratory-finding.source.js';
import { NutritionPolicyDeferralSource, NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';
import { IndividualizedNutritionTargetEvidence } from '../../types/individualized-nutrition-target-evidence.type.js';

export const CKD_POTASSIUM_POLICY_ID = 'ckd-potassium-v1';
export const CKD_POTASSIUM_POLICY_VERSION = 'v1';
export const CKD_POTASSIUM_EVIDENCE_MAX_AGE_DAYS = 365;

const KDOQI_SOURCE = 'KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update';
const KDOQI_SOURCE_VERSION = '2020-08-20';
const KDOQI_SOURCE_URL = 'https://www.kidney.org/professionals/kdoqi/guidelines-and-commentaries/nutrition-ckd';
const KDIGO_SOURCE = 'KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of CKD';
const KDIGO_SOURCE_VERSION = '2024-03-13';
const KDIGO_SOURCE_URL = 'https://kdigo.org/guidelines/ckd-evaluation-and-management/kdigo-2024-ckd-guideline/';

export interface CkdPotassiumPolicyResult {
  readonly potassiumMilligrams: string | null;
  readonly provenance: NutritionTargetProvenance | null;
  readonly deferredPolicy: NutritionPolicyDeferralSource | null;
}

/** Applies only an approved individualized potassium upper limit for CKD. */
export class CkdPotassiumPolicy {
  calculate(
    conditionCodes: readonly string[],
    target: IndividualizedNutritionTargetEvidence | null,
    potassiumFinding: LaboratoryFindingSource | null,
    asOf: Date = new Date(),
    potassiumFailureReason: string | null = null,
    potassiumFailureExplanation: string | null = null,
  ): CkdPotassiumPolicyResult {
    if (!conditionCodes.includes(CONDITION_CODES.CKD)) return this.empty();
    // There is no universal CKD potassium limit. A recorded potassium result
    // is useful context for transparency, but it must not activate scoring in
    // the absence of an approved individualized limit. Keep this as an
    // informational deferral: no target, rule, or target provenance is
    // produced.
    if (target == null || target.nutrientKey !== 'potassiumMilligrams') {
      return potassiumFinding == null
        ? this.empty()
        : this.defer(
          'missing-individualized-potassium-target',
          'Potassium was not included in this compatibility score because no individualized potassium limit is currently available. If your healthcare team has given you a potassium restriction, use this score together with that guidance.',
        );
    }
    if (target.kind !== 'upper-limit') {
      return this.defer('unsupported-potassium-target-kind', 'The available individualized potassium evidence is not an approved upper limit.');
    }
    if (target.targetValue == null) {
      return this.defer('invalid-potassium-target-value', 'The individualized potassium limit must include a numeric value.');
    }
    if (target.expiresAt != null && target.expiresAt <= asOf) {
      return this.defer('expired-individualized-potassium-target', 'The approved individualized potassium limit has expired and must be reviewed before CKD-specific guidance can continue.');
    }
    if (target.unit.trim().toLowerCase() !== 'mg/day') {
      return this.defer('invalid-potassium-target-unit', 'The individualized potassium limit must be expressed in mg/day.');
    }
    let targetValue: Decimal;
    try {
      targetValue = new Decimal(target.targetValue);
    } catch {
      return this.defer('invalid-potassium-target-value', 'The individualized potassium limit must be a positive numeric value.');
    }
    if (!targetValue.isFinite() || targetValue.lte(0)) {
      return this.defer('invalid-potassium-target-value', 'The individualized potassium limit must be a positive numeric value.');
    }
    if (potassiumFinding == null) {
      return this.defer(potassiumFailureReason === 'invalid-potassium-unit' ? 'invalid-potassium-unit' : potassiumFailureReason === 'invalid-potassium-value' ? 'invalid-potassium-value' : 'missing-potassium', potassiumFailureExplanation ?? 'A current serum potassium result is required to apply the individualized CKD potassium limit.');
    }
    if (!this.isFresh(potassiumFinding, asOf)) {
      return this.defer('stale-potassium', `The serum potassium result is older than the approved ${CKD_POTASSIUM_EVIDENCE_MAX_AGE_DAYS}-day evidence window.`);
    }

    const provenance: NutritionTargetProvenance = {
      target: 'potassiumMilligrams',
      policyId: CKD_POTASSIUM_POLICY_ID,
      source: KDOQI_SOURCE,
      sourceUrl: KDOQI_SOURCE_URL,
      sourceVersion: KDOQI_SOURCE_VERSION,
      guideline: { name: KDOQI_SOURCE, edition: '2020 Update', url: KDOQI_SOURCE_URL },
      applicability: {
        context: 'ckd-individualized-potassium',
        conditionCode: CONDITION_CODES.CKD,
        dialysisStatus: null,
        laboratory: {
          testCode: potassiumFinding.testCode,
          value: potassiumFinding.value,
          unit: potassiumFinding.unit,
          collectedAt: potassiumFinding.collectedAt.toISOString(),
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
      version: CKD_POTASSIUM_POLICY_VERSION,
      explanation: `This individualized potassium limit of ${target.targetValue} mg/day was supplied through an approved numeric target record and is applicable with current serum potassium evidence. KDOQI governs individualized potassium management; it does not provide a universal CKD potassium limit for this policy.`,
    };
    return { potassiumMilligrams: target.targetValue, provenance, deferredPolicy: null };
  }

  private isFresh(finding: LaboratoryFindingSource, asOf: Date): boolean {
    const ageMs = asOf.getTime() - finding.collectedAt.getTime();
    return ageMs >= 0 && ageMs <= CKD_POTASSIUM_EVIDENCE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  }

  private defer(reason: string, explanation: string): CkdPotassiumPolicyResult {
    return { potassiumMilligrams: null, provenance: null, deferredPolicy: { policyId: CKD_POTASSIUM_POLICY_ID, reason, explanation } };
  }

  private empty(): CkdPotassiumPolicyResult {
    return { potassiumMilligrams: null, provenance: null, deferredPolicy: null };
  }
}
