import { Decimal } from 'decimal.js';
import { CONDITION_CODES } from '../../../../conditions/types/condition-code.js';
import { ProfileSource } from '../../../../profiles/sources/profile.source.js';
import { NutritionPolicyDeferralSource, NutritionTargetAdjustment, NutritionTargetProvenance } from '../../types/nutrition-targets.type.js';
import { DialysisModalityContext, DialysisStatusContext } from '../../types/nutrition-evaluation-context.type.js';

export const PERITONEAL_DIALYSIS_PROTEIN_POLICY_ID = 'peritoneal-dialysis-protein-v1';
export const PERITONEAL_DIALYSIS_PROTEIN_POLICY_VERSION = 'v1';
export const PERITONEAL_DIALYSIS_EVIDENCE_MAX_AGE_DAYS = 365;

const KDOQI_SOURCE = 'KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update';
const KDOQI_SOURCE_VERSION = '2020-08-20';
const KDOQI_SOURCE_URL = 'https://www.kidney.org/professionals/kdoqi/guidelines-and-commentaries/nutrition-ckd';
const KDOQI_LOWER_PROTEIN_GRAMS_PER_KG = new Decimal('1.0');

export interface PeritonealDialysisProteinPolicyResult {
  readonly proteinGrams: string | null;
  readonly provenance: NutritionTargetProvenance | null;
  readonly adjustment: NutritionTargetAdjustment | null;
  readonly deferredPolicy: NutritionPolicyDeferralSource | null;
}

/** Owns only active peritoneal-dialysis protein guidance. */
export class PeritonealDialysisProteinPolicy {
  calculate(
    profile: Pick<ProfileSource, 'weightKg'> | null,
    conditionCodes: readonly string[],
    dialysisStatus: DialysisStatusContext | null,
    dialysisModality: DialysisModalityContext | null,
    dialysisReportedAt: Date | null,
    baselineProteinGrams: string | null,
    asOf: Date = new Date(),
  ): PeritonealDialysisProteinPolicyResult {
    if (!conditionCodes.includes(CONDITION_CODES.CKD) || dialysisStatus !== 'ACTIVE' || dialysisModality !== 'PERITONEAL_DIALYSIS') {
      return this.empty();
    }
    if (dialysisReportedAt == null || !this.isFresh(dialysisReportedAt, asOf)) {
      return this.defer('stale-dialysis-evidence', `Current peritoneal-dialysis evidence is required within the approved ${PERITONEAL_DIALYSIS_EVIDENCE_MAX_AGE_DAYS}-day freshness window.`);
    }
    if (profile?.weightKg == null) return this.defer('missing-weight', 'A current body weight is required for peritoneal-dialysis protein guidance.');

    const target = KDOQI_LOWER_PROTEIN_GRAMS_PER_KG.mul(profile.weightKg).toString();
    const provenance: NutritionTargetProvenance = {
      target: 'proteinGrams',
      policyId: PERITONEAL_DIALYSIS_PROTEIN_POLICY_ID,
      source: KDOQI_SOURCE,
      sourceUrl: KDOQI_SOURCE_URL,
      sourceVersion: KDOQI_SOURCE_VERSION,
      guideline: { name: KDOQI_SOURCE, edition: '2020 Update', url: KDOQI_SOURCE_URL },
      applicability: {
        context: 'peritoneal-dialysis',
        conditionCode: CONDITION_CODES.CKD,
        dialysisStatus,
        supportingSource: {
          name: 'KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of CKD',
          version: '2024-03-13',
          url: 'https://kdigo.org/guidelines/ckd-evaluation-and-management/kdigo-2024-ckd-guideline/',
        },
      },
      version: PERITONEAL_DIALYSIS_PROTEIN_POLICY_VERSION,
      explanation: 'The peritoneal-dialysis policy applies the KDOQI lower bound of 1.0 g/kg/day to recorded body weight. This policy is independently owned and does not inherit Hemodialysis behavior.',
    };
    return {
      proteinGrams: target,
      provenance,
      adjustment: baselineProteinGrams == null ? null : {
        target: 'proteinGrams', from: baselineProteinGrams, to: target,
        reasonCode: 'peritoneal-dialysis-protein-target',
        explanation: 'The Peritoneal Dialysis policy takes precedence over the generic protein baseline for an explicitly supported peritoneal-dialysis context.',
        policyId: PERITONEAL_DIALYSIS_PROTEIN_POLICY_ID,
        policyVersion: PERITONEAL_DIALYSIS_PROTEIN_POLICY_VERSION,
        conflictKey: 'nutrition-target:proteinGrams:daily-lower-limit',
        precedence: 'dialysis-over-general', provenance,
      },
      deferredPolicy: null,
    };
  }

  private isFresh(reportedAt: Date, asOf: Date): boolean {
    const ageMs = asOf.getTime() - reportedAt.getTime();
    return ageMs >= 0 && ageMs <= PERITONEAL_DIALYSIS_EVIDENCE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  }

  private defer(reason: string, explanation: string): PeritonealDialysisProteinPolicyResult {
    return { proteinGrams: null, provenance: null, adjustment: null, deferredPolicy: { policyId: PERITONEAL_DIALYSIS_PROTEIN_POLICY_ID, reason, explanation } };
  }

  private empty(): PeritonealDialysisProteinPolicyResult {
    return { proteinGrams: null, provenance: null, adjustment: null, deferredPolicy: null };
  }
}
