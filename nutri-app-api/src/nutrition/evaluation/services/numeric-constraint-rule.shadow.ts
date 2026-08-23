import { Decimal } from 'decimal.js';
import { FoodEvaluationInput } from '../types/food-evaluation.type.js';
import { NumericConstraintRule } from '../../analysis/types/evaluation-rule.type.js';

export interface NumericConstraintRuleEvaluation {
  readonly rule: NumericConstraintRule;
  readonly measuredValue: string | null;
  readonly quality: number | null;
  readonly evaluated: boolean;
  readonly reasonCode: string | null;
  readonly direction: 'positive' | 'negative' | 'neutral' | null;
}

/**
 * Shadow-only evaluator for the first NumericConstraintRule migration slice.
 * It is deliberately generic: the rule supplies the measurement key and kind.
 */
export class NumericConstraintRuleShadowEvaluator {
  evaluate(rule: NumericConstraintRule, input: Pick<FoodEvaluationInput, 'nutrients' | 'portionGrams'>): NumericConstraintRuleEvaluation {
    const nutrient = input.nutrients.find((candidate) => this.canonical(candidate.name) === this.canonical(rule.measurementKey) && candidate.unit.trim().toLowerCase() === rule.unit.trim().toLowerCase());
    if (nutrient == null) return { rule, measuredValue: null, quality: null, evaluated: false, reasonCode: null, direction: null };
    const measured = new Decimal(nutrient.amountPer100Grams).mul(input.portionGrams).div(100);
    const target = new Decimal(rule.targetValue);
    if (rule.kind === 'upper-limit') {
      const above = measured.gt(target);
      const quality = target.isZero() ? 0 : Math.max(0, Math.min(1, new Decimal(1).minus(measured.div(target)).toNumber()));
      return { rule, measuredValue: measured.toString(), quality, evaluated: true, reasonCode: above ? `${rule.measurementKey}-above-target` : `${rule.measurementKey}-contribution`, direction: above ? 'negative' : 'neutral' };
    }
    throw new Error(`Shadow numeric rule kind ${rule.kind} is not implemented in the first migration slice.`);
  }

  private canonical(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/-/g, ' ');
  }
}
