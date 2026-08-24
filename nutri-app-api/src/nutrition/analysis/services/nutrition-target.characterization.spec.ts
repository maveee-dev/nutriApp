import { ActivityLevel, Sex } from '../../../../generated/prisma/client.js';
import { NutritionTargetCalculator } from './nutrition-target-calculator.js';

describe('NutritionTargetCalculator characterization', () => {
  const calculator = new NutritionTargetCalculator();

  it('produces a deterministic complete-profile target calculation', () => {
    const input = {
      age: 42,
      sex: Sex.FEMALE,
      heightCm: 165,
      weightKg: 70,
      activityLevel: ActivityLevel.MODERATE,
    };

    const first = calculator.calculate(input);
    const second = calculator.calculate(input);

    expect(first).toEqual(second);
    expect(first.targets).toMatchObject({
      sodiumMilligrams: '2300',
      proteinGrams: '56',
      saturatedFatGrams: '20',
      addedSugarGrams: '50',
      fiberGrams: '28',
    });
    expect(first.targets.caloriesKcal).toBeDefined();
    expect(first.targetProvenance).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'sodiumMilligrams', policyId: 'general-nutrition-sodium-v1' }),
      expect.objectContaining({ target: 'caloriesKcal', policyId: 'energy-maintenance-v1' }),
    ]));
  });

  it('captures deterministic deferral when diabetes evidence is incomplete', () => {
    const result = calculator.calculate({ weightKg: 70 }, ['diabetes']);

    expect(result.targets.carbohydrateGrams).toBeUndefined();
    expect(result.deferredPolicies).toContainEqual({
      policyId: 'diabetes-carbohydrate-target-v1',
      reason: 'missing-individualized-carbohydrate-target',
      explanation: 'An approved individualized carbohydrate target is required for diabetes-specific carbohydrate guidance.',
    });
  });

  it('captures precedence and provenance for an approved individualized carbohydrate target', () => {
    const result = calculator.calculate(
      { weightKg: 70 },
      ['diabetes'],
      null,
      null,
      'maintenance',
      {
        userId: 'user-1',
        targetGrams: '180',
        approvalSource: 'CLINICIAN_APPROVED',
        sourceReference: 'care-plan-1',
        approvedAt: new Date('2026-08-01T00:00:00.000Z'),
        expiresAt: null,
      },
    );

    expect(result.targets.carbohydrateGrams).toBe('180');
    expect(result.targetProvenance).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'carbohydrateGrams', policyId: 'diabetes-carbohydrate-target-v1' }),
    ]));
    expect(result.deferredPolicies).not.toContainEqual(expect.objectContaining({ policyId: 'diabetes-carbohydrate-target-v1' }));
  });
});
