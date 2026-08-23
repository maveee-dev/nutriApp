import { MealAssessmentProjection } from './meal-assessment.projection.js';
import { NumericConstraintRule } from '../types/evaluation-rule.type.js';

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

const proteinRule: NumericConstraintRule = {
  family: 'numeric-constraint',
  kind: 'lower-target',
  roles: ['contribution', 'progress'],
  scopes: ['food', 'meal', 'daily'],
  measurementKey: 'protein',
  unit: 'g',
  weight: 30,
  target: 'proteinGrams',
  targetValue: '64',
  policyId: 'ckd-non-dialysis-protein-v1',
  policyVersion: 'v1',
  conflictKey: 'nutrition-target:proteinGrams:daily-lower-target',
  precedence: 20,
};

const rangeRule: NumericConstraintRule = {
  ...proteinRule,
  kind: 'recommended-range',
  policyId: 'future-range-policy-v1',
};

const potassiumRule: NumericConstraintRule = {
  family: 'numeric-constraint',
  kind: 'upper-limit',
  roles: ['compatibility', 'contribution', 'progress'],
  scopes: ['food', 'meal', 'daily'],
  measurementKey: 'potassium',
  unit: 'mg',
  weight: 30,
  target: 'potassiumMilligrams',
  targetValue: '2000',
  policyId: 'ckd-potassium-v1',
  policyVersion: 'v1',
  conflictKey: 'nutrition-target:potassiumMilligrams:daily-upper-limit',
  precedence: 25,
};

const phosphorusRule: NumericConstraintRule = {
  family: 'numeric-constraint',
  kind: 'upper-limit',
  roles: ['compatibility', 'contribution', 'progress'],
  scopes: ['food', 'meal', 'daily'],
  measurementKey: 'phosphorus',
  unit: 'mg',
  weight: 30,
  target: 'phosphorusMilligrams',
  targetValue: '800',
  policyId: 'ckd-phosphorus-v1',
  policyVersion: 'v1',
  conflictKey: 'nutrition-target:phosphorusMilligrams:daily-upper-limit',
  precedence: 25,
};

describe('MealAssessmentProjection', () => {
  it('aggregates supplied contributions and evaluates meal-scoped rules without recalculating nutrients', () => {
    const projection = new MealAssessmentProjection();

    const result = projection.project({
      contributions: [
        { nutrient: 'sodium', unit: 'mg', amount: '500', targetValue: '2300', currentDailyValue: null, explanation: 'First item.' },
        { nutrient: 'Sodium', unit: 'mg', amount: '250', targetValue: '2300', currentDailyValue: null, explanation: 'Second item.' },
        { nutrient: 'protein', unit: 'g', amount: '12', targetValue: '64', currentDailyValue: null, explanation: 'Protein contribution.' },
      ],
      resolvedRules: [sodiumRule, proteinRule],
      snapshotIds: ['snapshot-a', 'snapshot-b'],
      evaluatorVersion: 'food-evaluation-v3',
      policySetFingerprint: 'policy-set-1',
    });

    expect(result.status).toBe('evaluated');
    expect(result.coverage).toBe(100);
    expect(result.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ nutrient: 'sodium', amount: '750' }),
      expect.objectContaining({ nutrient: 'protein', amount: '12' }),
    ]));
    expect(result.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'within-limit', measuredValue: '750', direction: 'neutral' }),
      expect.objectContaining({ status: 'contribution', measuredValue: '12', percentageOfTarget: 18.75, direction: 'neutral' }),
    ]));
    expect(result.snapshotIds).toEqual(['snapshot-a', 'snapshot-b']);
  });

  it('evaluates active potassium safety and contribution from the same measured value', () => {
    const result = new MealAssessmentProjection().project({
      contributions: [{ nutrient: 'potassium', unit: 'mg', amount: '2200', targetValue: '2000', currentDailyValue: null, explanation: 'Potassium contribution.' }],
      resolvedRules: [potassiumRule],
    });

    expect(result).toMatchObject({ status: 'evaluated', coverage: 100 });
    expect(result.contributions).toContainEqual(expect.objectContaining({ nutrient: 'potassium', amount: '2200' }));
    expect(result.rules[0]).toMatchObject({ status: 'exceeded', measuredValue: '2200', direction: 'negative' });
  });

  it('keeps phosphorus contribution visible when the active safety rule evaluates it', () => {
    const result = new MealAssessmentProjection().project({
      contributions: [{ nutrient: 'phosphorus', unit: 'mg', amount: '420', targetValue: '800', currentDailyValue: null, explanation: 'Phosphorus contribution.' }],
      resolvedRules: [phosphorusRule],
    });

    expect(result).toMatchObject({ status: 'evaluated', coverage: 100 });
    expect(result.contributions).toContainEqual(expect.objectContaining({ nutrient: 'phosphorus', amount: '420' }));
    expect(result.rules[0]).toMatchObject({ status: 'within-limit', measuredValue: '420', direction: 'neutral', percentageOfTarget: 52.5 });
  });

  it('does not treat a partial lower-target contribution as negative compatibility', () => {
    const result = new MealAssessmentProjection().project({
      contributions: [{ nutrient: 'protein', unit: 'g', amount: '1', targetValue: '64', currentDailyValue: null, explanation: 'Contribution.' }],
      resolvedRules: [proteinRule],
    });

    expect(result.rules[0]).toMatchObject({ status: 'contribution', direction: 'neutral', percentageOfTarget: 1.56 });
  });

  it('reports insufficient evidence when a resolved rule has no supplied contribution', () => {
    const result = new MealAssessmentProjection().project({ resolvedRules: [sodiumRule] });

    expect(result).toMatchObject({ status: 'insufficient-evidence', coverage: 0 });
    expect(result.rules[0]).toMatchObject({ status: 'insufficient-evidence', measuredValue: null, direction: null });
  });

  it('is deterministic for identical inputs', () => {
    const projection = new MealAssessmentProjection();
    const input = { resolvedRules: [sodiumRule], contributions: [{ nutrient: 'sodium', amount: '100', targetValue: '2300', currentDailyValue: null, explanation: 'Contribution.' }] };

    expect(projection.project(input)).toEqual(projection.project(input));
  });

  it('does not count unsupported recommended ranges as evaluated evidence', () => {
    const result = new MealAssessmentProjection().project({
      contributions: [{ nutrient: 'protein', unit: 'g', amount: '20', targetValue: '64', currentDailyValue: null, explanation: 'Contribution.' }],
      resolvedRules: [rangeRule],
    });

    expect(result).toMatchObject({ status: 'insufficient-evidence', coverage: 0 });
    expect(result.rules[0]).toMatchObject({ status: 'insufficient-evidence', limitationCode: 'unsupported-rule-kind' });
  });

  it('rejects missing and mismatched contribution units before numeric evaluation', () => {
    const projection = new MealAssessmentProjection();
    const missingUnit = projection.project({
      contributions: [{ nutrient: 'sodium', amount: '400', targetValue: '2300', currentDailyValue: null, explanation: 'Legacy contribution.' }],
      resolvedRules: [sodiumRule],
    });
    const mismatchedUnit = projection.project({
      contributions: [{ nutrient: 'sodium', unit: 'g', amount: '400', targetValue: '2300', currentDailyValue: null, explanation: 'Wrong unit.' }],
      resolvedRules: [sodiumRule],
    });

    expect(missingUnit.rules[0]).toMatchObject({ status: 'insufficient-evidence', limitationCode: 'missing-contribution-unit' });
    expect(mismatchedUnit.rules[0]).toMatchObject({ status: 'insufficient-evidence', limitationCode: 'unit-mismatch' });
    expect(mismatchedUnit.status).toBe('insufficient-evidence');
  });

  it('returns an explicit insufficient-evidence result for caller-supplied limitations', () => {
    const result = new MealAssessmentProjection().project({
      resolvedRules: [],
      limitations: [{ code: 'missing-current-evidence', explanation: 'The current snapshot is unavailable.' }],
    });

    expect(result).toMatchObject({ status: 'insufficient-evidence', coverage: 0 });
    expect(result.limitations).toEqual([{ code: 'missing-current-evidence', explanation: 'The current snapshot is unavailable.' }]);
  });
});
