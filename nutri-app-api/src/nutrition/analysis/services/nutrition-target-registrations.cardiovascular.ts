import { CardiovascularSaturatedFatPolicy } from '../policies/cardiovascular/cardiovascular-saturated-fat.policy.js';
import { CardiovascularSodiumPolicy } from '../policies/cardiovascular/cardiovascular-sodium.policy.js';
import { NutritionTargetPolicyRegistration } from '../types/nutrition-target-policy.type.js';
import { TARGET_KEYS, candidate, emptyOutput, find, output, simple } from './nutrition-target-registration.helpers.js';

export function createCardiovascularTargetRegistrations(): readonly NutritionTargetPolicyRegistration[] {
  const sodium = new CardiovascularSodiumPolicy();
  const saturatedFat = new CardiovascularSaturatedFatPolicy();
  return [
    simple('cardiovascular-sodium-v1', 'v1', (context, candidates) => {
      const baseline = find(candidates, 'sodiumMilligrams');
      if (baseline?.provenance == null) return emptyOutput();
      const result = sodium.calculate(context.conditionCodes, baseline.value, baseline.provenance);
      return result.adjustment == null ? emptyOutput() : output(candidate('cardiovascular-sodium-v1', 'v1', 'sodiumMilligrams', result.sodiumMilligrams, TARGET_KEYS.sodium, 20, 2, 10, result.provenance, result.adjustment.supportingProvenance, result.adjustment));
    }, { dependsOn: ['general-nutrition-sodium-v1'], precedenceByConflictKey: { [TARGET_KEYS.sodium]: 20 } }),
    simple('cardiovascular-saturated-fat-v1', 'v1', (context, candidates) => {
      const baseline = find(candidates, 'saturatedFatGrams');
      const calories = find(candidates, 'caloriesKcal');
      if (baseline?.provenance == null) return emptyOutput();
      const result = saturatedFat.calculate(context.conditionCodes, baseline.value, baseline.provenance, calories?.value ?? null);
      return output(result.adjustment == null ? undefined : candidate('cardiovascular-saturated-fat-v1', 'v1', 'saturatedFatGrams', result.saturatedFatGrams, TARGET_KEYS.saturatedFat, 20, 2, 20, result.provenance, result.adjustment.supportingProvenance, result.adjustment), result.deferredPolicy == null ? [] : [{ ...result.deferredPolicy, conflictKey: TARGET_KEYS.saturatedFat, precedence: 20 }]);
    }, { dependsOn: ['general-nutrition-saturated-fat-v1', 'energy-maintenance-v1'], precedenceByConflictKey: { [TARGET_KEYS.saturatedFat]: 20 } }),
  ];
}
