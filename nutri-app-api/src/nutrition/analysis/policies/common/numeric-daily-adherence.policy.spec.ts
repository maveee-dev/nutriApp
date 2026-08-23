import { NumericDailyAdherencePolicy } from './numeric-daily-adherence.policy.js';
import { NumericConstraintRule } from '../../types/evaluation-rule.type.js';

describe('NumericDailyAdherencePolicy', () => {
  const policy = new NumericDailyAdherencePolicy();
  const snapshot = (id: string, amount: string, nutrient = 'potassium', resolvedRule: NumericConstraintRule | null = null) => ({
    id, mealItemId: id, score: 90, coverage: 100, evaluatorVersion: 'v2', policyVersion: 'v1', snapshotVersion: 'v1', evaluatedAt: new Date('2026-08-22T00:00:00Z'),
    payload: {
      reasons: [],
      contributions: [{ nutrient, unit: nutrient === 'protein' ? 'g' : 'mg', amount, targetValue: nutrient === 'protein' ? '60' : nutrient === 'phosphorus' ? '800' : '2000', currentDailyValue: null, explanation: 'contribution' }],
      targets: { sodiumMilligrams: '2300', proteinGrams: null, potassiumMilligrams: '2000', phosphorusMilligrams: '800' },
      deferredPolicies: [], policySetFingerprint: 'policy-fingerprint', resolvedRules: resolvedRule == null ? [] : [resolvedRule],
    },
  });
  const rule: NumericConstraintRule = {
    family: 'numeric-constraint', kind: 'upper-limit', roles: ['compatibility', 'contribution', 'progress'], scopes: ['food', 'meal', 'daily'],
    measurementKey: 'potassium', unit: 'mg', weight: 30, target: 'potassiumMilligrams', targetValue: '2000', policyId: 'ckd-potassium-v1', policyVersion: 'v1', conflictKey: 'potassium', precedence: 25,
  };
  const phosphorusRule: NumericConstraintRule = {
    ...rule,
    measurementKey: 'phosphorus',
    target: 'phosphorusMilligrams',
    targetValue: '800',
    policyId: 'ckd-phosphorus-v1',
    conflictKey: 'phosphorus',
  };

  it('aggregates an upper-limit rule from immutable contributions', () => {
    const result = policy.calculate(rule, [snapshot('s1', '700', 'potassium', rule), snapshot('s2', '1500', 'potassium', rule)], 2);
    expect(result).toMatchObject({ status: 'available', consumedValue: '2200', remainingValue: '0', exceededValue: '200', coveragePercentage: 100, policyId: 'ckd-potassium-v1' });
  });

  it('aggregates phosphorus through the same generic upper-limit path', () => {
    const result = policy.calculate(phosphorusRule, [snapshot('s1', '300', 'phosphorus', phosphorusRule), snapshot('s2', '600', 'phosphorus', phosphorusRule)], 2);
    expect(result).toMatchObject({ status: 'available', consumedValue: '900', remainingValue: '0', exceededValue: '100', coveragePercentage: 100, policyId: 'ckd-phosphorus-v1', measurementKey: 'phosphorus' });
  });

  it('uses the same generic path for lower-target progress', () => {
    const lowerRule = { ...rule, kind: 'lower-target' as const, target: 'proteinGrams' as const, measurementKey: 'protein', unit: 'g', targetValue: '60' };
    const result = policy.calculate(lowerRule, [snapshot('s1', '20', 'protein', lowerRule)], 1);
    expect(result).toMatchObject({ status: 'available', consumedValue: '20', remainingValue: '40', exceededValue: null });
  });

  it('defers when replay fingerprints are incompatible or coverage is incomplete', () => {
    const result = policy.calculate(rule, [snapshot('s1', '700', 'potassium', rule)], 2);
    expect(result).toMatchObject({ status: 'deferred', deferredPolicy: { reason: 'insufficient-historical-coverage' } });
    const incompatible = { ...snapshot('s2', '1500', 'potassium', rule), evaluatorVersion: 'v3' };
    expect(policy.calculate(rule, [snapshot('s1', '700'), incompatible], 2).deferredPolicy?.reason).toBe('mixed-evaluator-versions');
  });
});
