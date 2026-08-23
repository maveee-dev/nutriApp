import { GeneralNutritionSaturatedFatPolicy } from '../general/general-nutrition-saturated-fat.policy.js';
import {
  CARDIOVASCULAR_SATURATED_FAT_CONFLICT_KEY,
  CARDIOVASCULAR_SATURATED_FAT_POLICY_ID,
  CardiovascularSaturatedFatPolicy,
} from './cardiovascular-saturated-fat.policy.js';

describe('CardiovascularSaturatedFatPolicy', () => {
  const policy = new CardiovascularSaturatedFatPolicy();
  const generalNutrition = new GeneralNutritionSaturatedFatPolicy().calculate();

  it('preserves the General Nutrition reference outside the supported context', () => {
    expect(policy.calculate([], '20', generalNutrition.provenance, '2000')).toEqual({
      saturatedFatGrams: '20',
      provenance: generalNutrition.provenance,
      adjustment: null,
      deferredPolicy: null,
    });
  });

  it('defers without maintenance energy and preserves the baseline', () => {
    expect(policy.calculate(['hypertension'], '20', generalNutrition.provenance, null)).toEqual({
      saturatedFatGrams: '20',
      provenance: generalNutrition.provenance,
      adjustment: null,
      deferredPolicy: expect.objectContaining({
        policyId: CARDIOVASCULAR_SATURATED_FAT_POLICY_ID,
        reason: 'missing-maintenance-energy',
      }),
    });
  });

  it('calculates the cardiovascular target with explicit precedence and supporting provenance', () => {
    const result = policy.calculate(['hypertension'], '20', generalNutrition.provenance, '2000');

    expect(result.saturatedFatGrams).toBe('13.33');
    expect(result.provenance).toEqual(expect.objectContaining({
      policyId: CARDIOVASCULAR_SATURATED_FAT_POLICY_ID,
    }));
    expect(result.adjustment).toEqual(expect.objectContaining({
      conflictKey: CARDIOVASCULAR_SATURATED_FAT_CONFLICT_KEY,
      precedence: 'condition-specific-over-general',
      supportingProvenance: [generalNutrition.provenance],
    }));
  });

  it('is deterministic', () => {
    expect(policy.calculate(['hypertension'], '20', generalNutrition.provenance, '2759'))
      .toEqual(policy.calculate(['hypertension'], '20', generalNutrition.provenance, '2759'));
  });
});
