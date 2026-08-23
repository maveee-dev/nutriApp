import { createGeneralNutritionTargetRegistrations } from './nutrition-target-registrations.general.js';
import { ResolvedNumericRuleFactory } from './resolved-numeric-rule.factory.js';

describe('ResolvedNumericRuleFactory', () => {
  it('resolves the sodium registration into a dynamic numeric rule', () => {
    const registration = createGeneralNutritionTargetRegistrations().find((item) => item.policyId === 'general-nutrition-sodium-v1')!;
    const candidate = registration.evaluate({ profile: null, conditionCodes: [], energyGoal: 'maintenance', asOf: new Date(), evidence: {}, baselineProteinGrams: null }, []).candidates[0];
    expect(new ResolvedNumericRuleFactory().create(candidate, registration)).toMatchObject({
      family: 'numeric-constraint', kind: 'upper-limit', target: 'sodiumMilligrams', targetValue: '2300',
      policyId: 'general-nutrition-sodium-v1', roles: ['compatibility', 'contribution', 'progress'], scopes: ['food', 'meal', 'daily'],
    });
  });
});
