import { DiabetesCarbohydrateTargetPolicy, DIABETES_CARBOHYDRATE_TARGET_POLICY_ID, DIABETES_CARBOHYDRATE_TARGET_POLICY_VERSION } from '../policies/diabetes/diabetes-carbohydrate-target.policy.js';
import { NutritionTargetPolicyRegistration } from '../types/nutrition-target-policy.type.js';
import { TARGET_KEYS, candidate, output, simple } from './nutrition-target-registration.helpers.js';
import { requireEvidenceSlice } from '../types/nutrition-evidence-provider.type.js';
import { DIABETES_EVIDENCE_KEY } from './nutrition-evidence.providers.js';
import { DiabetesNutritionEvidence } from '../types/diabetes-nutrition-evidence.slice.js';

export function createDiabetesTargetRegistrations(): readonly NutritionTargetPolicyRegistration[] {
  const diabetes = new DiabetesCarbohydrateTargetPolicy();
  return [simple(DIABETES_CARBOHYDRATE_TARGET_POLICY_ID, DIABETES_CARBOHYDRATE_TARGET_POLICY_VERSION, (context) => {
    const diabetesEvidence = requireEvidenceSlice<DiabetesNutritionEvidence>(context.evidence, DIABETES_EVIDENCE_KEY);
    const result = diabetes.calculate(context.conditionCodes, diabetesEvidence.carbohydrateTarget, context.asOf);
    return output(result.provenance == null ? undefined : candidate(DIABETES_CARBOHYDRATE_TARGET_POLICY_ID, DIABETES_CARBOHYDRATE_TARGET_POLICY_VERSION, 'carbohydrateGrams', result.carbohydrateGrams!, TARGET_KEYS.carbohydrate, 20, 2, 90, result.provenance), result.deferredPolicy == null ? [] : [{ ...result.deferredPolicy, conflictKey: TARGET_KEYS.carbohydrate, precedence: 20 }]);
  }, {
    precedenceByConflictKey: { [TARGET_KEYS.carbohydrate]: 20 },
    evaluationRule: {
      family: 'numeric-constraint',
      kind: 'lower-target',
      roles: ['contribution', 'progress'],
      scopes: ['food', 'meal', 'daily'],
      measurementKey: 'carbohydrates',
      unit: 'g',
      weight: 25,
    },
  })];
}
