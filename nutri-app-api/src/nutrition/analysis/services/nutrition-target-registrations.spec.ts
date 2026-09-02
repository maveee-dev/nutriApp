import { composeNutritionTargetPolicyRegistrations, createNutritionTargetPolicyRegistrations } from './nutrition-target-registrations.js';

describe('nutrition target registration composition', () => {
  const registration = (policyId: string, dependsOn: readonly string[] = []) => ({
    policyId,
    version: 'v1',
    dependsOn,
    evaluate: () => ({ candidates: [], deferredPolicies: [] }),
  });

  it('orders dependencies before dependents', () => {
    const result = composeNutritionTargetPolicyRegistrations([
      registration('dependent', ['baseline']),
      registration('baseline'),
    ]);
    expect(result.map(({ policyId }) => policyId)).toEqual(['baseline', 'dependent']);
  });

  it('rejects duplicate registrations and dependency cycles', () => {
    expect(() => composeNutritionTargetPolicyRegistrations([registration('same'), registration('same')])).toThrow('Duplicate');
    expect(() => composeNutritionTargetPolicyRegistrations([
      registration('a', ['b']),
      registration('b', ['a']),
    ])).toThrow('cycle');
  });

  it('rejects a lower-target rule registered as food compatibility', () => {
    expect(() => composeNutritionTargetPolicyRegistrations([{
      ...registration('invalid-rule'),
      evaluationRule: {
        family: 'numeric-constraint', kind: 'lower-target', roles: ['compatibility'], scopes: ['food'],
        measurementKey: 'protein', unit: 'g', weight: 10,
      },
    }])).toThrow('lower-target');
  });

  it('declares Diabetes carbohydrate as contribution and progress rather than food compatibility', () => {
    const registration = createNutritionTargetPolicyRegistrations().find(({ policyId }) => policyId === 'diabetes-carbohydrate-target-v1');

    expect(registration?.evaluationRule).toEqual({
      family: 'numeric-constraint',
      kind: 'lower-target',
      roles: ['contribution', 'progress'],
      scopes: ['food', 'meal', 'daily'],
      measurementKey: 'carbohydrates',
      unit: 'g',
      weight: 25,
    });
  });

  it('does not register the legacy universal cholesterol policy for current evaluation', () => {
    expect(createNutritionTargetPolicyRegistrations().some(({ policyId }) => policyId === 'general-nutrition-cholesterol-v1')).toBe(false);
  });

  it('declares one shared projection descriptor for every currently targeted nutrient', () => {
    const registrations = createNutritionTargetPolicyRegistrations();
    const descriptor = (policyId: string) => registrations.find(({ policyId: id }) => id === policyId)?.evaluationRule;

    expect(descriptor('general-nutrition-sodium-v1')).toEqual(expect.objectContaining({ measurementKey: 'sodium', unit: 'mg', kind: 'upper-limit' }));
    expect(descriptor('general-nutrition-saturated-fat-v1')).toEqual(expect.objectContaining({ measurementKey: 'saturated-fat', unit: 'g', kind: 'upper-limit' }));
    expect(descriptor('general-nutrition-added-sugars-v1')).toEqual(expect.objectContaining({ measurementKey: 'added-sugar', unit: 'g', kind: 'upper-limit' }));
    expect(descriptor('general-nutrition-fiber-v1')).toEqual(expect.objectContaining({ measurementKey: 'fiber', unit: 'g', kind: 'lower-target' }));
    expect(descriptor('general-protein-baseline-v1')).toEqual(expect.objectContaining({ measurementKey: 'protein', unit: 'g', kind: 'lower-target' }));
    expect(descriptor('diabetes-carbohydrate-target-v1')).toEqual(expect.objectContaining({ measurementKey: 'carbohydrates', unit: 'g', kind: 'lower-target' }));
    expect(descriptor('ckd-potassium-v1')).toEqual(expect.objectContaining({ measurementKey: 'potassium', unit: 'mg', kind: 'upper-limit' }));
    expect(descriptor('ckd-phosphorus-v1')).toEqual(expect.objectContaining({ measurementKey: 'phosphorus', unit: 'mg', kind: 'upper-limit' }));
  });
});
