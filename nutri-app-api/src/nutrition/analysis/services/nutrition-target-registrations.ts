import { NutritionTargetPolicyRegistration } from '../types/nutrition-target-policy.type.js';
import { validateNumericConstraintDescriptor } from '../types/evaluation-rule.type.js';
import { createCardiovascularTargetRegistrations } from './nutrition-target-registrations.cardiovascular.js';
import { createCkdTargetRegistrations } from './nutrition-target-registrations.ckd.js';
import { createDiabetesTargetRegistrations } from './nutrition-target-registrations.diabetes.js';
import { createGeneralNutritionTargetRegistrations } from './nutrition-target-registrations.general.js';

export function createNutritionTargetPolicyRegistrations(): readonly NutritionTargetPolicyRegistration[] {
  return composeNutritionTargetPolicyRegistrations([
    ...createGeneralNutritionTargetRegistrations(),
    ...createCardiovascularTargetRegistrations(),
    ...createDiabetesTargetRegistrations(),
    ...createCkdTargetRegistrations(),
  ]);
}

export function composeNutritionTargetPolicyRegistrations(
  registrations: readonly NutritionTargetPolicyRegistration[],
): readonly NutritionTargetPolicyRegistration[] {
  validateRegistrations(registrations);
  const byId = new Map(registrations.map((registration) => [registration.policyId, registration]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: NutritionTargetPolicyRegistration[] = [];

  const visit = (registration: NutritionTargetPolicyRegistration): void => {
    if (visited.has(registration.policyId)) return;
    if (visiting.has(registration.policyId)) throw new Error(`Nutrition target policy dependency cycle detected at ${registration.policyId}.`);
    visiting.add(registration.policyId);
    for (const dependencyId of registration.dependsOn ?? []) {
      const dependency = byId.get(dependencyId);
      if (dependency == null) throw new Error(`Nutrition target policy ${registration.policyId} depends on missing policy ${dependencyId}.`);
      visit(dependency);
    }
    visiting.delete(registration.policyId);
    visited.add(registration.policyId);
    ordered.push(registration);
  };

  registrations.forEach(visit);
  return ordered;
}

function validateRegistrations(registrations: readonly NutritionTargetPolicyRegistration[]): void {
  const ids = new Set<string>();
  for (const registration of registrations) {
    if (ids.has(registration.policyId)) throw new Error(`Duplicate nutrition target policy registration: ${registration.policyId}.`);
    ids.add(registration.policyId);
    for (const [conflictKey, precedence] of Object.entries(registration.precedenceByConflictKey ?? {})) {
      if (!Number.isFinite(precedence) || precedence < 0) throw new Error(`Invalid precedence for ${registration.policyId} on ${conflictKey}.`);
    }
    if (registration.evaluationRule != null) validateNumericConstraintDescriptor(registration.evaluationRule);
  }
}
