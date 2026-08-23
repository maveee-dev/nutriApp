import { NumericConstraintRule } from '../../analysis/types/evaluation-rule.type.js';
import { NumericConstraintRuleShadowEvaluator } from './numeric-constraint-rule.shadow.js';

const rule: NumericConstraintRule = {
  family: 'numeric-constraint', kind: 'upper-limit', roles: ['compatibility'], scopes: ['food'],
  measurementKey: 'sodium', unit: 'mg', weight: 40, target: 'sodiumMilligrams', targetValue: '2300',
  policyId: 'general-nutrition-sodium-v1', policyVersion: 'v1', conflictKey: 'sodium', precedence: 10,
};

describe('NumericConstraintRuleShadowEvaluator', () => {
  it('evaluates an upper-limit rule deterministically', () => {
    const evaluator = new NumericConstraintRuleShadowEvaluator();
    const input = { portionGrams: '100', nutrients: [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '460' }] };
    expect(evaluator.evaluate(rule, input)).toMatchObject({ measuredValue: '460', quality: 0.8, evaluated: true, reasonCode: 'sodium-contribution', direction: 'neutral' });
    expect(evaluator.evaluate(rule, input)).toEqual(evaluator.evaluate(rule, input));
  });

  it('reports missing evidence without manufacturing a zero score', () => {
    const result = new NumericConstraintRuleShadowEvaluator().evaluate(rule, { portionGrams: '100', nutrients: [] });
    expect(result).toMatchObject({ measuredValue: null, quality: null, evaluated: false });
  });
});
