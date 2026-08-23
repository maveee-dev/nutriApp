import { Decimal } from 'decimal.js';
import { createHash } from 'node:crypto';
import { NumericConstraintRule } from '../types/evaluation-rule.type.js';
import { FoodEvaluationContribution, FoodEvaluationReason } from '../../evaluation/types/food-evaluation.type.js';
import { MealAssessmentInput, MealAssessmentLimitationCode, MealAssessmentRuleResult, MealAssessmentSource } from '../types/meal-assessment.type.js';

/**
 * Stateless meal-scope projection over already evaluated compatibility and
 * contribution outputs.
 *
 * This class deliberately does not load data, calculate nutrient values, resolve
 * policy precedence, or make recommendations. Callers supply the contributions
 * and resolved rules that are authoritative for the evaluation context.
 */
export class MealAssessmentProjection {
  project(input: MealAssessmentInput): MealAssessmentSource {
    const contributions = input.contributions ?? [];
    const rules = input.resolvedRules
      .filter((rule) => rule.roles.includes('progress') && rule.scopes.includes('meal'))
      .map((rule) => this.evaluateRule(rule, contributions, input.compatibilityReasons ?? []));
    const limitations = [...(input.limitations ?? [])];
    const evaluatedCount = rules.filter((result) => result.status !== 'insufficient-evidence').length;
    const coverage = rules.length === 0
      ? 0
      : new Decimal(evaluatedCount).div(rules.length).mul(100).toDecimalPlaces(2).toNumber();
    const status = rules.length === 0
      ? limitations.length === 0 ? 'not-applicable' : 'insufficient-evidence'
      : limitations.length > 0 || evaluatedCount !== rules.length ? 'insufficient-evidence' : 'evaluated';
    const aggregatedContributions = this.aggregateContributions(contributions);

    const result: MealAssessmentSource = {
      status,
      coverage,
      contributions: aggregatedContributions,
      rules,
      deferredPolicies: [...(input.deferredPolicies ?? [])],
      limitations,
      ...(input.snapshotIds == null ? {} : { snapshotIds: [...input.snapshotIds] }),
      ...(input.evaluatorVersion == null ? {} : { evaluatorVersion: input.evaluatorVersion }),
      ...(input.policySetFingerprint == null ? {} : { policySetFingerprint: input.policySetFingerprint }),
      evaluationFingerprint: input.evaluationFingerprint ?? this.fingerprint({
        status,
        coverage,
        contributions: aggregatedContributions,
        rules,
        deferredPolicies: input.deferredPolicies ?? [],
        limitations,
        evaluatorVersion: input.evaluatorVersion ?? null,
        policySetFingerprint: input.policySetFingerprint ?? null,
      }),
    };
    return result;
  }

  private evaluateRule(rule: NumericConstraintRule, contributions: readonly FoodEvaluationContribution[], compatibilityReasons: readonly FoodEvaluationReason[]): MealAssessmentRuleResult {
    if (rule.kind === 'recommended-range') {
      return {
        rule,
        measuredValue: null,
        targetValue: rule.targetValue,
        percentageOfTarget: null,
        status: 'insufficient-evidence',
        direction: null,
        limitationCode: 'unsupported-rule-kind',
        explanation: `This meal cannot be assessed for ${rule.measurementKey} because recommended-range semantics are not yet supported by this projection.`,
      };
    }

    const measurement = this.sumForRule(rule, contributions, compatibilityReasons);
    if (measurement.value == null) {
      return {
        rule,
        measuredValue: null,
        targetValue: rule.targetValue,
        percentageOfTarget: null,
        status: 'insufficient-evidence',
        direction: null,
        limitationCode: measurement.limitationCode,
        explanation: measurement.limitationCode === 'missing-contribution-unit'
          ? `This meal cannot be assessed for ${rule.measurementKey} because the contribution evidence does not include a unit.`
          : measurement.limitationCode === 'unit-mismatch'
            ? `This meal cannot be assessed for ${rule.measurementKey} because the contribution unit does not match the rule unit of ${rule.unit}.`
            : `This meal cannot be assessed for ${rule.measurementKey} because the required contribution evidence is unavailable.`,
      };
    }

    const measuredValue = measurement.value;

    const measured = new Decimal(measuredValue);
    const target = new Decimal(rule.targetValue);
    const percentageOfTarget = target.isZero()
      ? null
      : measured.div(target).mul(100).toDecimalPlaces(2).toNumber();

    if (rule.kind === 'upper-limit') {
      const exceeded = measured.gt(target);
      return {
        rule,
        measuredValue: measured.toString(),
        targetValue: target.toString(),
        percentageOfTarget,
        status: exceeded ? 'exceeded' : 'within-limit',
        direction: exceeded ? 'negative' : 'neutral',
        explanation: exceeded
          ? `This meal provides ${measured.toString()} ${rule.unit} of ${rule.measurementKey}, exceeding the applicable limit of ${target.toString()} ${rule.unit}.`
          : `This meal provides ${measured.toString()} ${rule.unit} of ${rule.measurementKey}, within the applicable limit of ${target.toString()} ${rule.unit}.`,
      };
    }

    if (rule.kind === 'lower-target') {
      return {
        rule,
        measuredValue: measured.toString(),
        targetValue: target.toString(),
        percentageOfTarget,
        status: 'contribution',
        direction: 'neutral',
        explanation: `This meal provides ${measured.toString()} ${rule.unit} of ${rule.measurementKey}, ${percentageOfTarget == null ? 'with no calculable target percentage' : `${percentageOfTarget}% of the applicable target`}.`,
      };
    }

    return {
      rule,
      measuredValue: measured.toString(),
      targetValue: target.toString(),
      percentageOfTarget,
      status: 'insufficient-evidence',
      direction: null,
      limitationCode: 'unsupported-rule-kind',
      explanation: `This meal cannot be assessed for ${rule.measurementKey} because the registered range semantics are not yet supported by this projection.`,
    };
  }

  private sumForRule(
    rule: NumericConstraintRule,
    contributions: readonly FoodEvaluationContribution[],
    compatibilityReasons: readonly FoodEvaluationReason[],
  ): { readonly value: string | null; readonly limitationCode?: MealAssessmentLimitationCode } {
    const matching = contributions.filter((contribution) => this.canonical(contribution.nutrient) === this.canonical(rule.measurementKey));
    if (matching.length === 0) {
      const safetyReasons = compatibilityReasons.filter((reason) => this.canonical(reason.nutrient) === this.canonical(rule.measurementKey));
      if (safetyReasons.length === 0) return { value: null };
      return {
        value: safetyReasons.reduce((sum, reason) => sum.plus(new Decimal(reason.measuredValue)), new Decimal(0)).toString(),
      };
    }
    if (matching.some((contribution) => contribution.unit == null || contribution.unit.trim() === '')) {
      return { value: null, limitationCode: 'missing-contribution-unit' };
    }
    const expectedUnit = this.canonicalUnit(rule.unit);
    if (matching.some((contribution) => this.canonicalUnit(contribution.unit!) !== expectedUnit)) {
      return { value: null, limitationCode: 'unit-mismatch' };
    }
    return {
      value: matching.reduce((sum, contribution) => sum.plus(new Decimal(contribution.amount)), new Decimal(0)).toString(),
    };
  }

  private aggregateContributions(contributions: readonly FoodEvaluationContribution[]): readonly FoodEvaluationContribution[] {
    const totals = new Map<string, { nutrient: string; unit?: string; amount: Decimal; targetValue: string | null; explanation: string }>();
    for (const contribution of contributions) {
      const key = `${this.canonical(contribution.nutrient)}|${this.canonicalUnit(contribution.unit ?? '')}`;
      const existing = totals.get(key);
      totals.set(key, {
        nutrient: existing?.nutrient ?? this.canonical(contribution.nutrient),
        ...(contribution.unit == null ? {} : { unit: existing?.unit ?? contribution.unit }),
        amount: (existing?.amount ?? new Decimal(0)).plus(new Decimal(contribution.amount)),
        targetValue: existing?.targetValue ?? contribution.targetValue,
        explanation: existing?.explanation ?? contribution.explanation,
      });
    }
    return [...totals.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, value]) => ({
        nutrient: value.nutrient,
        ...(value.unit == null ? {} : { unit: value.unit }),
        amount: value.amount.toString(),
        targetValue: value.targetValue,
        currentDailyValue: null,
        explanation: value.explanation,
      }));
  }

  private canonical(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/-/g, ' ');
  }

  private canonicalUnit(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private fingerprint(value: unknown): string {
    return `sha256:${createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')}`;
  }
}
