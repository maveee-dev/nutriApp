import { NumericConstraintRule } from '../../analysis/types/evaluation-rule.type.js';
import { NumericConstraintRuleComparisonService } from './numeric-constraint-rule.comparison.js';

const rule: NumericConstraintRule = {
  family: 'numeric-constraint', kind: 'upper-limit', roles: ['compatibility'], scopes: ['food'], measurementKey: 'sodium', unit: 'mg', weight: 40,
  target: 'sodiumMilligrams', targetValue: '2300', policyId: 'general-nutrition-sodium-v1', policyVersion: 'v1', conflictKey: 'sodium', precedence: 10,
};
const base = { portionGrams: '100', targets: { sodiumMilligrams: '2300', proteinGrams: null }, targetCalculation: { targets: { sodiumMilligrams: '2300', proteinGrams: null }, adjustments: [], deferredPolicies: [] } } as const;

describe('NumericConstraintRuleComparisonService', () => {
  it('confirms sodium parity for the migrated rule', () => {
    const result = new NumericConstraintRuleComparisonService().compare(rule, { ...base, nutrients: [{ name: 'Sodium', unit: 'mg', amountPer100Grams: '2500' }] }, { totalCompatibilityWeight: 40, policyFingerprint: 'policy-set-v1', snapshotPayload: { evaluation: 'snapshot-v1' } });
    expect(result.equivalent).toBe(true);
    expect(result.legacyReason?.code).toBe('sodium-above-target');
    expect(result.shadow.reasonCode).toBe('sodium-above-target');
    expect(result.differences).toEqual([]);
    expect(result.legacyContract.policyFingerprint).toBe('policy-set-v1');
    expect(result.shadowContract.snapshotPayload).toEqual({ evaluation: 'snapshot-v1' });
  });

  it('preserves insufficient-evidence semantics in the complete contract', () => {
    const result = new NumericConstraintRuleComparisonService().compare(rule, { ...base, nutrients: [] }, { totalCompatibilityWeight: 70 });
    expect(result.equivalent).toBe(true);
    expect(result.legacyContract.evaluationStatus).toBe('insufficient-evidence');
    expect(result.shadowContract.evaluationStatus).toBe('insufficient-evidence');
    expect(result.legacyContract.score).toBe(0);
    expect(result.differences).toEqual([]);
  });
});
