import { Decimal } from 'decimal.js';
import { CONDITION_CODES } from '../../../../conditions/types/condition-code.js';
import { ProfileSource } from '../../../../profiles/sources/profile.source.js';
import { NutritionPolicyDeferralSource, NutritionTargetAdjustment, NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';
import { DialysisModalityContext, DialysisStatusContext } from '../../types/nutrition-evaluation-context.type.js';

export const HEMODIALYSIS_PROTEIN_POLICY_ID = 'hemodialysis-protein-v1';
export const HEMODIALYSIS_PROTEIN_POLICY_VERSION = 'v1';
export const DIALYSIS_EVIDENCE_MAX_AGE_DAYS = 365;

const KDOQI_SOURCE = 'KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update';
const KDOQI_SOURCE_VERSION = '2020-08-20';
const KDOQI_SOURCE_URL = 'https://www.kidney.org/professionals/kdoqi/guidelines-and-commentaries/nutrition-ckd';
const KDOQI_LOWER_PROTEIN_GRAMS_PER_KG = new Decimal('1.0');

export interface HemodialysisProteinPolicyResult {
  readonly proteinGrams: string | null;
  readonly provenance: NutritionTargetProvenance | null;
  readonly adjustment: NutritionTargetAdjustment | null;
  readonly deferredPolicy: NutritionPolicyDeferralSource | null;
}

/** Owns only active hemodialysis protein guidance; it never inherits non-dialysis CKD behavior. */
export class HemodialysisProteinPolicy {
  calculate(
    profile: Pick<ProfileSource, 'weightKg'> | null,
    conditionCodes: readonly string[],
    dialysisStatus: DialysisStatusContext | null,
    dialysisModality: DialysisModalityContext | null,
    dialysisReportedAt: Date | null,
    baselineProteinGrams: string | null,
    asOf: Date = new Date(),
  ): HemodialysisProteinPolicyResult {
    if (!conditionCodes.includes(CONDITION_CODES.CKD) || dialysisStatus !== 'ACTIVE') return this.empty();
    if (dialysisModality == null || dialysisModality === 'UNKNOWN') {
      return this.defer('missing-dialysis-modality', 'An explicit dialysis modality is required before hemodialysis-specific protein guidance can apply.');
    }
    if (dialysisModality === 'CONFLICTING') {
      return this.defer('conflicting-dialysis-modality', 'Conflicting dialysis modality evidence must be resolved before hemodialysis-specific protein guidance can apply.');
    }
    if (dialysisModality === 'PERITONEAL_DIALYSIS') return this.empty();
    if (dialysisReportedAt == null || !this.isFresh(dialysisReportedAt, asOf)) {
      return this.defer('stale-dialysis-evidence', `Current hemodialysis evidence is required within the approved ${DIALYSIS_EVIDENCE_MAX_AGE_DAYS}-day freshness window.`);
    }
    if (profile?.weightKg == null) return this.defer('missing-weight', 'A current body weight is required for hemodialysis-specific protein guidance.');

    const target = KDOQI_LOWER_PROTEIN_GRAMS_PER_KG.mul(profile.weightKg).toString();
    const provenance: NutritionTargetProvenance = {
      target: 'proteinGrams',
      policyId: HEMODIALYSIS_PROTEIN_POLICY_ID,
      source: KDOQI_SOURCE,
      sourceUrl: KDOQI_SOURCE_URL,
      sourceVersion: KDOQI_SOURCE_VERSION,
      guideline: { name: KDOQI_SOURCE, edition: '2020 Update', url: KDOQI_SOURCE_URL },
      applicability: {
        context: 'hemodialysis',
        conditionCode: CONDITION_CODES.CKD,
        dialysisStatus,
        supportingSource: {
          name: 'KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of CKD',
          version: '2024-03-13',
          url: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/kdigo-2024-ckd-guideline/',
        },
      },
      version: HEMODIALYSIS_PROTEIN_POLICY_VERSION,
      explanation: 'The hemodialysis policy applies the KDOQI lower bound of 1.0 g/kg/day to recorded body weight. The broader KDOQI range is 1.0–1.2 g/kg/day; this is a nutrition reference, not a treatment prescription.',
    };
    return {
      proteinGrams: target,
      provenance,
      adjustment: baselineProteinGrams == null ? null : {
        target: 'proteinGrams', from: baselineProteinGrams, to: target,
        reasonCode: 'hemodialysis-protein-target',
        explanation: 'The Hemodialysis policy takes precedence over the generic protein baseline for an explicitly supported hemodialysis context.',
        policyId: HEMODIALYSIS_PROTEIN_POLICY_ID,
        policyVersion: HEMODIALYSIS_PROTEIN_POLICY_VERSION,
        conflictKey: 'nutrition-target:proteinGrams:daily-lower-limit',
        precedence: 'dialysis-over-general', provenance,
      },
      deferredPolicy: null,
    };
  }

  private isFresh(reportedAt: Date, asOf: Date): boolean {
    const ageMs = asOf.getTime() - reportedAt.getTime();
    return ageMs >= 0 && ageMs <= DIALYSIS_EVIDENCE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  }

  private defer(reason: string, explanation: string): HemodialysisProteinPolicyResult {
    return { proteinGrams: null, provenance: null, adjustment: null, deferredPolicy: { policyId: HEMODIALYSIS_PROTEIN_POLICY_ID, reason, explanation } };
  }

  private empty(): HemodialysisProteinPolicyResult {
    return { proteinGrams: null, provenance: null, adjustment: null, deferredPolicy: null };
  }
}
