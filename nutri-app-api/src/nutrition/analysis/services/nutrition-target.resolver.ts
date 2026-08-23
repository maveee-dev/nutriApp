import { NutritionPolicyDeferralSource, NutritionTargetCalculation, NutritionTargetProvenance, NutritionTargets } from '../types/nutrition-targets.type.js';
import { NutritionTargetCandidate } from '../types/nutrition-target-policy.type.js';
import { EnergyGoal } from '../policies/common/energy.policy.js';
import { NUTRITION_TARGET_DESCRIPTORS } from '../types/nutrition-target-descriptor.js';
import { NutritionTargetPolicyRegistration } from '../types/nutrition-target-policy.type.js';
import { ResolvedNumericRuleFactory } from './resolved-numeric-rule.factory.js';

export class NutritionTargetResolver {
  constructor(private readonly ruleFactory: ResolvedNumericRuleFactory = new ResolvedNumericRuleFactory()) {}

  resolve(
    candidates: readonly NutritionTargetCandidate[],
    deferredPolicies: readonly NutritionPolicyDeferralSource[],
    energyGoal?: EnergyGoal,
    registrations: readonly NutritionTargetPolicyRegistration[] = [],
  ): NutritionTargetCalculation {
    const winners = new Map<string, NutritionTargetCandidate>();
    for (const candidate of candidates) {
      const existing = winners.get(candidate.conflictKey);
      if (existing == null || this.compare(candidate, existing) < 0) winners.set(candidate.conflictKey, candidate);
    }

    const selected = [...winners.values()].sort((left, right) => left.order - right.order || left.candidateId.localeCompare(right.candidateId));
    const sodiumMilligrams = this.valueFor(selected, 'sodiumMilligrams');
    if (sodiumMilligrams == null) throw new Error('No nutrition policy supplied the required sodiumMilligrams target.');
    const targets = Object.fromEntries(NUTRITION_TARGET_DESCRIPTORS.flatMap((descriptor) => {
      const value = this.valueFor(selected, descriptor.key);
      if (value == null && !descriptor.required) return [];
      return [[descriptor.key, value ?? null]];
    })) as unknown as NutritionTargets;
    const targetProvenance = this.uniqueProvenance(selected.flatMap((candidate) => [
      ...(candidate.provenance == null ? [] : [candidate.provenance]),
      ...(candidate.supportingProvenance ?? []),
    ]));
    const resolvedDeferrals = this.resolveDeferrals(deferredPolicies, selected);
    const resolvedRules = selected.flatMap((candidate) => {
      const registration = registrations.find((item) => item.policyId === candidate.policyId && item.version === candidate.policyVersion);
      if (registration == null) return [];
      const rule = this.ruleFactory.create(candidate, registration);
      return rule == null ? [] : [rule];
    });

    return {
      targets,
      adjustments: selected.flatMap((candidate) => candidate.adjustment == null ? [] : [candidate.adjustment]),
      deferredPolicies: resolvedDeferrals,
      ...(targetProvenance.length === 0 ? {} : { targetProvenance }),
      ...(resolvedRules.length === 0 ? {} : { resolvedRules }),
      ...(energyGoal == null ? {} : { energyGoal }),
    };
  }

  private compare(left: NutritionTargetCandidate, right: NutritionTargetCandidate): number {
    if (left.precedence !== right.precedence) return right.precedence - left.precedence;
    if (left.specificity !== right.specificity) return right.specificity - left.specificity;
    return left.candidateId.localeCompare(right.candidateId);
  }

  private resolveDeferrals(
    deferrals: readonly NutritionPolicyDeferralSource[],
    selected: readonly NutritionTargetCandidate[],
  ): readonly NutritionPolicyDeferralSource[] {
    const unsuppressed = deferrals.filter((deferral) => {
      const sameDimension = deferral.conflictKey == null
        ? []
        : selected.filter((candidate) => candidate.conflictKey === deferral.conflictKey);
      const winningCandidate = sameDimension[0];
      if (winningCandidate != null && winningCandidate.precedence > (deferral.precedence ?? 0)) return false;
      return true;
    });
    const highestByConflict = new Map<string, NutritionPolicyDeferralSource>();
    const result: NutritionPolicyDeferralSource[] = [];
    for (const deferral of unsuppressed) {
      if (deferral.conflictKey == null) {
        if (!result.some((previous) => previous.conflictKey == null && previous.policyId === deferral.policyId && previous.reason === deferral.reason)) result.push(deferral);
        continue;
      }
      const existing = highestByConflict.get(deferral.conflictKey);
      if (existing == null || (deferral.precedence ?? 0) > (existing.precedence ?? 0)) highestByConflict.set(deferral.conflictKey, deferral);
    }
    for (const deferral of unsuppressed) {
      if (deferral.conflictKey != null && highestByConflict.get(deferral.conflictKey) === deferral) result.push(deferral);
    }
    return result.map(({ policyId, reason, explanation }) => ({ policyId, reason, explanation }));
  }

  private valueFor(candidates: readonly NutritionTargetCandidate[], target: keyof NutritionTargets): string | null {
    return candidates.find((candidate) => candidate.target === target)?.value ?? null;
  }

  private uniqueProvenance(values: readonly NutritionTargetProvenance[]): readonly NutritionTargetProvenance[] {
    const seen = new Set<string>();
    return values.filter((value) => {
      const key = JSON.stringify(value);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }); 
  }
}
