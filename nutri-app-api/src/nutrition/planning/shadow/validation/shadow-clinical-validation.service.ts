import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { ShadowMealCandidateSource } from '../types/shadow-meal-planning.source.js';
import type { ShadowClinicalFixtureValidationInput, ShadowClinicalFixtureValidationReport } from './shadow-clinical-validation.source.js';

const REQUIRED_COMPLETE_MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER'] as const;
const STANDALONE_NON_MEAL_PATTERN = /\b(beer|ale|lager|wine|vodka|whiskey|whisky|rum|gin|tequila|alcohol|sauce|ketchup|mustard|mayonnaise|mayo|dressing|gravy|condiment|spice|seasoning|vinegar|relish|flour|starch|raw material|ingredient|beverage|water|juice|soda|coffee|tea|coleslaw)\b/i;

@Injectable()
export class ShadowClinicalFixtureValidationService {
  validate(input: ShadowClinicalFixtureValidationInput): ShadowClinicalFixtureValidationReport {
    const { fixture, run } = input;
    const first = run.first;
    const second = run.second;
    const failures: string[] = [];
    const selected = first.shadowPlan.selected;
    const aggregate = first.dailyAggregate.evaluation;
    const policyIds = new Set(aggregate?.targetCalculation.targetProvenance?.map(({ policyId }) => policyId) ?? []);
    const deferredPolicies = aggregate?.evaluation.deferredPolicies.map(({ policyId }) => policyId) ?? [];
    const selectedMealPlan = selected.map((candidate) => ({
      mealType: candidate.mealType,
      templateVersionId: candidate.templateVersionId,
      recipeSources: candidate.resolvedSources.filter(({ source }) => source === 'recipe').map(({ sourceId }) => sourceId),
    }));

    for (const mealType of REQUIRED_COMPLETE_MEAL_TYPES) {
      const candidate = selected.find(({ mealType: selectedType }) => selectedType === mealType);
      if (candidate == null) failures.push(`missing-complete-meal:${mealType.toLowerCase()}`);
      else this.validateMeal(candidate, failures, mealType);
    }
    if (aggregate == null) failures.push('missing-daily-aggregate-evaluation');
    if (aggregate != null && aggregate.evaluation.coverage <= 0) failures.push('missing-daily-evidence-coverage');
    if (aggregate != null && aggregate.evaluation.reasons.some(({ direction }) => direction === 'negative')) failures.push('daily-policy-constraint-not-satisfied');
    for (const expectedPolicyId of fixture.expectedPolicyIds) {
      if (!policyIds.has(expectedPolicyId)) failures.push(`missing-expected-policy-provenance:${expectedPolicyId}`);
    }
    for (const expectedDeferredPolicyId of fixture.expectedDeferredPolicyIds) {
      if (!deferredPolicies.includes(expectedDeferredPolicyId)) failures.push(`missing-expected-deferral:${expectedDeferredPolicyId}`);
    }
    for (const unsupportedConditionCode of fixture.unsupportedConditionCodes) {
      const claimed = aggregate?.targetCalculation.targetProvenance?.some(({ applicability }) => applicability?.conditionCode === unsupportedConditionCode) ?? false;
      if (claimed) failures.push(`unsupported-condition-claimed:${unsupportedConditionCode}`);
    }
    const firstFingerprint = this.fingerprint(run.first);
    const secondFingerprint = this.fingerprint(run.second);
    if (firstFingerprint !== secondFingerprint) failures.push('non-deterministic-repeated-run-output');

    return {
      fixtureId: fixture.id,
      selectedMealPlan,
      aggregateDailyEvaluation: aggregate == null ? null : { score: aggregate.evaluation.score, coverage: aggregate.evaluation.coverage },
      compatibilityScore: aggregate?.evaluation.score ?? null,
      policyCoverage: policyIds.size,
      evidenceCoverage: aggregate?.evaluation.coverage ?? 0,
      deferredPolicies,
      plannerLimitations: [...new Set([...first.shadowPlan.selected.flatMap(({ evaluation }) => evaluation.limitations), ...first.dailyAggregate.limitations])],
      deterministicFingerprints: { first: firstFingerprint, second: secondFingerprint },
      pass: failures.length === 0,
      failures: [...new Set(failures)],
    };
  }

  private validateMeal(candidate: ShadowMealCandidateSource, failures: string[], mealType: string): void {
    if (candidate.components.length === 0) failures.push(`empty-meal:${mealType.toLowerCase()}`);
    if (candidate.templateProvenance.approvalStatus !== 'APPROVED') failures.push(`unapproved-template:${candidate.templateVersionId}`);
    if (candidate.evaluation.provenance.recipeFingerprint.length === 0) failures.push(`missing-meal-fingerprint:${candidate.templateVersionId}`);
    if (candidate.evaluation.provenance.canonicalFoods.length === 0) failures.push(`missing-canonical-food-provenance:${candidate.templateVersionId}`);
    if (candidate.components.length === 1 && STANDALONE_NON_MEAL_PATTERN.test(candidate.components[0]?.foodName ?? '')) failures.push(`inappropriate-standalone-food:${mealType.toLowerCase()}`);
  }

  private fingerprint(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(this.normalize(value))).digest('hex');
  }

  private normalize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.normalize(item));
    if (value != null && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => key !== 'asOf').sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, this.normalize(item)]));
    }
    return value;
  }
}
