import { EnergyPolicy } from '../policies/common/energy.policy.js';
import { GeneralNutritionAddedSugarsPolicy } from '../policies/general/general-nutrition-added-sugars.policy.js';
import { GeneralNutritionFiberPolicy } from '../policies/general/general-nutrition-fiber.policy.js';
import { GeneralNutritionSaturatedFatPolicy } from '../policies/general/general-nutrition-saturated-fat.policy.js';
import { GeneralNutritionSodiumPolicy } from '../policies/general/general-nutrition-sodium.policy.js';
import { NutritionTargetPolicyRegistration } from '../types/nutrition-target-policy.type.js';
import { NUTRITION_EVALUATION_RULE_DESCRIPTORS } from '../types/numeric-evaluation-rule-descriptors.js';
import { TARGET_KEYS, candidate, emptyOutput, output, simple } from './nutrition-target-registration.helpers.js';

export function createGeneralNutritionTargetRegistrations(): readonly NutritionTargetPolicyRegistration[] {
  const sodium = new GeneralNutritionSodiumPolicy();
  const saturatedFat = new GeneralNutritionSaturatedFatPolicy();
  const addedSugar = new GeneralNutritionAddedSugarsPolicy();
  const fiber = new GeneralNutritionFiberPolicy();
  const energy = new EnergyPolicy();
  return [
    simple('general-nutrition-sodium-v1', 'v1', () => {
      const result = sodium.calculate();
      return output(candidate('general-nutrition-sodium-v1', 'v1', 'sodiumMilligrams', result.sodiumMilligrams, TARGET_KEYS.sodium, 10, 1, 10, result.provenance));
    }, {
      precedenceByConflictKey: { [TARGET_KEYS.sodium]: 10 },
      evaluationRule: NUTRITION_EVALUATION_RULE_DESCRIPTORS.sodium,
    }),
    simple('general-nutrition-saturated-fat-v1', 'v1', () => {
      const result = saturatedFat.calculate();
      return output(candidate('general-nutrition-saturated-fat-v1', 'v1', 'saturatedFatGrams', result.saturatedFatGrams, TARGET_KEYS.saturatedFat, 10, 1, 20, result.provenance));
    }, {
      precedenceByConflictKey: { [TARGET_KEYS.saturatedFat]: 10 },
      evaluationRule: NUTRITION_EVALUATION_RULE_DESCRIPTORS.saturatedFat,
    }),
    simple('general-nutrition-added-sugars-v1', 'v1', () => {
      const result = addedSugar.calculate();
      return output(candidate('general-nutrition-added-sugars-v1', 'v1', 'addedSugarGrams', result.addedSugarGrams, TARGET_KEYS.addedSugar, 10, 1, 30, result.provenance));
    }, {
      precedenceByConflictKey: { [TARGET_KEYS.addedSugar]: 10 },
      evaluationRule: NUTRITION_EVALUATION_RULE_DESCRIPTORS.addedSugar,
    }),
    simple('general-nutrition-fiber-v1', 'v1', () => {
      const result = fiber.calculate();
      return output(candidate('general-nutrition-fiber-v1', 'v1', 'fiberGrams', result.fiberGrams, TARGET_KEYS.fiber, 10, 1, 50, result.provenance));
    }, {
      precedenceByConflictKey: { [TARGET_KEYS.fiber]: 10 },
      evaluationRule: NUTRITION_EVALUATION_RULE_DESCRIPTORS.fiber,
    }),
    simple('general-protein-baseline-v1', 'v1', (context) => context.baselineProteinGrams == null
      ? emptyOutput()
      : output(candidate('general-protein-baseline-v1', 'v1', 'proteinGrams', context.baselineProteinGrams, TARGET_KEYS.protein, 5, 1, 60)),
      {
        precedenceByConflictKey: { [TARGET_KEYS.protein]: 5 },
        evaluationRule: NUTRITION_EVALUATION_RULE_DESCRIPTORS.protein,
      }),
    simple('energy-maintenance-v1', 'v1', (context) => {
      const result = energy.calculate(context.profile, context.energyGoal);
      return result.caloriesKcal == null || result.provenance == null
        ? (context.energyGoal === 'maintenance' ? emptyOutput() : output(undefined, [{ policyId: 'energy-goal', reason: 'energy-goal-policy-pending', explanation: `The ${context.energyGoal} calorie adjustment policy has not been approved yet; maintenance energy remains the only implemented goal.` }]))
        : output(candidate('energy-maintenance-v1', 'v1', 'caloriesKcal', result.caloriesKcal, TARGET_KEYS.calories, 10, 1, 100, result.provenance));
    }, { precedenceByConflictKey: { [TARGET_KEYS.calories]: 10 } }),
  ];
}
