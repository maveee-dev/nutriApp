import { Decimal } from 'decimal.js';
import { MealAssessmentProjection } from './meal-assessment.projection.js';
import { NumericDailyAdherencePolicy } from '../policies/common/numeric-daily-adherence.policy.js';
import { DiabetesCarbohydrateAdherencePolicy } from '../policies/diabetes/diabetes-carbohydrate-adherence.policy.js';
import type { NumericConstraintRule } from '../types/evaluation-rule.type.js';

const sodiumRule: NumericConstraintRule = {
  family: 'numeric-constraint',
  kind: 'upper-limit',
  roles: ['compatibility', 'progress'],
  scopes: ['food', 'meal', 'daily'],
  measurementKey: 'sodium',
  unit: 'mg',
  weight: 40,
  target: 'sodiumMilligrams',
  targetValue: '2300',
  policyId: 'general-nutrition-sodium-v1',
  policyVersion: 'v1',
  conflictKey: 'nutrition-target:sodiumMilligrams:daily-upper-limit',
  precedence: 10,
};

const potassiumRule: NumericConstraintRule = {
  ...sodiumRule,
  measurementKey: 'potassium',
  unit: 'mg',
  target: 'potassiumMilligrams',
  targetValue: '2000',
  policyId: 'ckd-potassium-v1',
};

function legacyMealAggregate(contributions: readonly { nutrient: string; unit?: string; amount: string; targetValue: string | null; explanation: string }[]) {
  const totals = new Map<string, { nutrient: string; unit?: string; amount: Decimal; targetValue: string | null; explanation: string }>();
  const canonical = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/-/g, ' ');
  const canonicalUnit = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
  for (const contribution of contributions) {
    const key = `${canonical(contribution.nutrient)}|${canonicalUnit(contribution.unit ?? '')}`;
    const existing = totals.get(key);
    totals.set(key, {
      nutrient: existing?.nutrient ?? canonical(contribution.nutrient),
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

function snapshot(id: string, mealItemId: string, amount: string, nutrient: string, unit: string, rule: NumericConstraintRule) {
  return {
    id,
    mealItemId,
    score: 100,
    coverage: 100,
    evaluatorVersion: 'food-evaluation-v3',
    policyVersion: 'nutrition-policies-v1',
    snapshotVersion: '1',
    evaluatedAt: new Date(`2026-08-22T00:0${id === 's1' ? '1' : '2'}:00.000Z`),
    payload: {
      reasons: [],
      contributions: [{ nutrient, unit, amount, targetValue: rule.targetValue, currentDailyValue: null, explanation: 'contribution' }],
      targets: { sodiumMilligrams: '2300', proteinGrams: null, potassiumMilligrams: '2000', carbohydrateGrams: '180' },
      deferredPolicies: [],
      policySetFingerprint: 'policy-set-1',
      resolvedRules: [rule],
    },
  };
}

describe('Meal Assessment and Daily Adherence kernel migration parity', () => {
  it('preserves Meal Assessment aggregate metadata, ordering, and rule measurement', () => {
    const contributions = [
      { nutrient: 'Sodium', unit: 'mg', amount: '0.1', targetValue: '2300', currentDailyValue: null, explanation: 'first sodium' },
      { nutrient: ' sodium ', unit: 'MG', amount: '0.2', targetValue: '2300', currentDailyValue: null, explanation: 'second sodium' },
      { nutrient: 'Protein', unit: 'g', amount: '1.234567', targetValue: '64', currentDailyValue: null, explanation: 'protein' },
    ];
    const result = new MealAssessmentProjection().project({ contributions, resolvedRules: [sodiumRule] });

    expect(result.contributions).toEqual(legacyMealAggregate(contributions));
    expect(result.rules[0]).toMatchObject({ measuredValue: '0.3', status: 'within-limit' });
  });

  it('preserves generic Numeric Daily Adherence Decimal aggregation', () => {
    const policy = new NumericDailyAdherencePolicy();
    const rule = potassiumRule;
    const snapshots = [snapshot('s1', 'item-1', '0.1', 'potassium', 'mg', rule), snapshot('s2', 'item-2', '0.2', 'potassium', 'mg', rule)];
    const result = policy.calculate(rule, snapshots, 2);

    expect(result).toMatchObject({ status: 'available', consumedValue: '0.3', remainingValue: '1999.7', coveragePercentage: 100 });
  });

  it('preserves Diabetes Daily Adherence Decimal aggregation', () => {
    const policy = new DiabetesCarbohydrateAdherencePolicy();
    const result = policy.calculate({
      targetCarbohydrateGrams: '180',
      targetProvenance: null,
      targetDeferral: null,
      snapshots: [
        snapshot('s1', 'item-1', '0.1', 'carbohydrates', 'g', { ...potassiumRule, target: 'carbohydrateGrams', measurementKey: 'carbohydrates', unit: 'g', targetValue: '180' }),
        snapshot('s2', 'item-2', '0.2', 'carbohydrates', 'g', { ...potassiumRule, target: 'carbohydrateGrams', measurementKey: 'carbohydrates', unit: 'g', targetValue: '180' }),
      ],
      expectedMealItemCount: 2,
    });

    expect(result).toMatchObject({ status: 'available', consumedCarbohydrateGrams: '0.3', remainingCarbohydrateGrams: '179.7', exceededByGrams: '0', coveragePercentage: 100 });
  });
});
