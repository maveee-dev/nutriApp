import { CkdProteinPolicy, CKD_NON_DIALYSIS_PROTEIN_POLICY_ID, CKD_NON_DIALYSIS_PROTEIN_POLICY_VERSION } from '../policies/ckd/ckd-protein.policy.js';
import { HemodialysisProteinPolicy, HEMODIALYSIS_PROTEIN_POLICY_ID, HEMODIALYSIS_PROTEIN_POLICY_VERSION } from '../policies/ckd/hemodialysis-protein.policy.js';
import { PeritonealDialysisProteinPolicy, PERITONEAL_DIALYSIS_PROTEIN_POLICY_ID, PERITONEAL_DIALYSIS_PROTEIN_POLICY_VERSION } from '../policies/ckd/peritoneal-dialysis-protein.policy.js';
import { NutritionTargetPolicyRegistration } from '../types/nutrition-target-policy.type.js';
import { TARGET_KEYS, candidate, find, output, simple } from './nutrition-target-registration.helpers.js';
import { requireEvidenceSlice } from '../types/nutrition-evidence-provider.type.js';
import { RENAL_EVIDENCE_KEY } from './nutrition-evidence.providers.js';
import { RenalNutritionEvidence } from '../types/renal-nutrition-evidence.slice.js';
import { CkdPotassiumPolicy, CKD_POTASSIUM_POLICY_ID, CKD_POTASSIUM_POLICY_VERSION } from '../policies/ckd/ckd-potassium.policy.js';
import { INDIVIDUALIZED_TARGETS_EVIDENCE_KEY } from './nutrition-evidence.providers.js';
import { IndividualizedTargetsNutritionEvidence } from '../types/individualized-targets-nutrition-evidence.slice.js';
import { CkdPhosphorusPolicy, CKD_PHOSPHORUS_POLICY_ID, CKD_PHOSPHORUS_POLICY_VERSION } from '../policies/ckd/ckd-phosphorus.policy.js';
import { NUTRITION_EVALUATION_RULE_DESCRIPTORS } from '../types/numeric-evaluation-rule-descriptors.js';

export function createCkdTargetRegistrations(): readonly NutritionTargetPolicyRegistration[] {
  const ckd = new CkdProteinPolicy();
  const hemodialysis = new HemodialysisProteinPolicy();
  const peritoneal = new PeritonealDialysisProteinPolicy();
  const potassium = new CkdPotassiumPolicy();
  const phosphorus = new CkdPhosphorusPolicy();
  return [
    simple(CKD_PHOSPHORUS_POLICY_ID, CKD_PHOSPHORUS_POLICY_VERSION, (context) => {
      const renal = requireEvidenceSlice<RenalNutritionEvidence>(context.evidence, RENAL_EVIDENCE_KEY);
      const individualized = (context.evidence[INDIVIDUALIZED_TARGETS_EVIDENCE_KEY] as IndividualizedTargetsNutritionEvidence | undefined) ?? { targets: [] };
      const result = phosphorus.calculate(context.conditionCodes, individualized.targets.find((item) => item.nutrientKey === 'phosphorusMilligrams') ?? null, renal.phosphorusFinding ?? null, renal.egfrFinding, renal.dialysisStatus, context.asOf, renal.egfrFailureReason ?? null, renal.egfrFailureExplanation ?? null, renal.phosphorusFailureReason ?? null, renal.phosphorusFailureExplanation ?? null);
      return output(result.provenance == null ? undefined : candidate(CKD_PHOSPHORUS_POLICY_ID, CKD_PHOSPHORUS_POLICY_VERSION, 'phosphorusMilligrams', result.phosphorusMilligrams!, TARGET_KEYS.phosphorus, 25, 3, 56, result.provenance), result.deferredPolicy == null ? [] : [{ ...result.deferredPolicy, conflictKey: TARGET_KEYS.phosphorus, precedence: 25 }]);
    }, {
      precedenceByConflictKey: { [TARGET_KEYS.phosphorus]: 25 }, evaluationRule: NUTRITION_EVALUATION_RULE_DESCRIPTORS.phosphorus,
    }),
    simple(CKD_POTASSIUM_POLICY_ID, CKD_POTASSIUM_POLICY_VERSION, (context) => {
      const renal = requireEvidenceSlice<RenalNutritionEvidence>(context.evidence, RENAL_EVIDENCE_KEY);
      const individualized = (context.evidence[INDIVIDUALIZED_TARGETS_EVIDENCE_KEY] as IndividualizedTargetsNutritionEvidence | undefined) ?? { targets: [] };
      const result = potassium.calculate(context.conditionCodes, individualized.targets.find((item) => item.nutrientKey === 'potassiumMilligrams') ?? null, renal.potassiumFinding, context.asOf, renal.potassiumFailureReason ?? null, renal.potassiumFailureExplanation ?? null);
      return output(result.provenance == null ? undefined : candidate(CKD_POTASSIUM_POLICY_ID, CKD_POTASSIUM_POLICY_VERSION, 'potassiumMilligrams', result.potassiumMilligrams!, TARGET_KEYS.potassium, 25, 3, 55, result.provenance), result.deferredPolicy == null ? [] : [{ ...result.deferredPolicy, conflictKey: TARGET_KEYS.potassium, precedence: 25 }]);
    }, {
      precedenceByConflictKey: { [TARGET_KEYS.potassium]: 25 }, evaluationRule: NUTRITION_EVALUATION_RULE_DESCRIPTORS.potassium,
    }),
    simple(CKD_NON_DIALYSIS_PROTEIN_POLICY_ID, CKD_NON_DIALYSIS_PROTEIN_POLICY_VERSION, (context, candidates) => {
      const baseline = find(candidates, 'proteinGrams');
      const renal = requireEvidenceSlice<RenalNutritionEvidence>(context.evidence, RENAL_EVIDENCE_KEY);
      const result = ckd.calculate(context.profile, context.conditionCodes, renal.egfrFinding, renal.dialysisStatus, baseline?.value ?? null, context.asOf, renal.egfrFailureReason, renal.egfrFailureExplanation);
      return output(result.provenance == null ? undefined : candidate(CKD_NON_DIALYSIS_PROTEIN_POLICY_ID, CKD_NON_DIALYSIS_PROTEIN_POLICY_VERSION, 'proteinGrams', result.proteinGrams!, TARGET_KEYS.protein, 20, 2, 60, result.provenance), result.deferredPolicy == null ? [] : [{ ...result.deferredPolicy, conflictKey: TARGET_KEYS.protein, precedence: 20 }]);
    }, {
      dependsOn: ['general-protein-baseline-v1'], precedenceByConflictKey: { [TARGET_KEYS.protein]: 20 }, evaluationRule: NUTRITION_EVALUATION_RULE_DESCRIPTORS.protein,
    }),
    simple(HEMODIALYSIS_PROTEIN_POLICY_ID, HEMODIALYSIS_PROTEIN_POLICY_VERSION, (context, candidates) => {
      const baseline = find(candidates, 'proteinGrams');
      const renal = requireEvidenceSlice<RenalNutritionEvidence>(context.evidence, RENAL_EVIDENCE_KEY);
      const result = hemodialysis.calculate(context.profile, context.conditionCodes, renal.dialysisStatus, renal.dialysisModality, renal.dialysisReportedAt, baseline?.value ?? null, context.asOf);
      return output(result.provenance == null ? undefined : candidate(HEMODIALYSIS_PROTEIN_POLICY_ID, HEMODIALYSIS_PROTEIN_POLICY_VERSION, 'proteinGrams', result.proteinGrams!, TARGET_KEYS.protein, 30, 3, 70, result.provenance, undefined, result.adjustment ?? undefined), result.deferredPolicy == null ? [] : [{ ...result.deferredPolicy, conflictKey: TARGET_KEYS.protein, precedence: 30 }]);
    }, {
      dependsOn: ['general-protein-baseline-v1'], precedenceByConflictKey: { [TARGET_KEYS.protein]: 30 }, evaluationRule: NUTRITION_EVALUATION_RULE_DESCRIPTORS.protein,
    }),
    simple(PERITONEAL_DIALYSIS_PROTEIN_POLICY_ID, PERITONEAL_DIALYSIS_PROTEIN_POLICY_VERSION, (context, candidates) => {
      const baseline = find(candidates, 'proteinGrams');
      const renal = requireEvidenceSlice<RenalNutritionEvidence>(context.evidence, RENAL_EVIDENCE_KEY);
      const result = peritoneal.calculate(context.profile, context.conditionCodes, renal.dialysisStatus, renal.dialysisModality, renal.dialysisReportedAt, baseline?.value ?? null, context.asOf);
      return output(result.provenance == null ? undefined : candidate(PERITONEAL_DIALYSIS_PROTEIN_POLICY_ID, PERITONEAL_DIALYSIS_PROTEIN_POLICY_VERSION, 'proteinGrams', result.proteinGrams!, TARGET_KEYS.protein, 30, 3, 71, result.provenance, undefined, result.adjustment ?? undefined), result.deferredPolicy == null ? [] : [{ ...result.deferredPolicy, conflictKey: TARGET_KEYS.protein, precedence: 30 }]);
    }, {
      dependsOn: ['general-protein-baseline-v1'], precedenceByConflictKey: { [TARGET_KEYS.protein]: 30 }, evaluationRule: NUTRITION_EVALUATION_RULE_DESCRIPTORS.protein,
    }),
  ];
}
