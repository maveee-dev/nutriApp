import { NutritionTargetCalculator } from './nutrition-target-calculator.js';
import { ActivityLevel, DialysisModality, DialysisStatus, NutritionGoal, Sex } from '../../../../generated/prisma/client.js';

describe('NutritionTargetCalculator', () => {
  const calculator = new NutritionTargetCalculator();

  it('includes the profile-derived energy target and provenance when the profile is complete', () => {
    const result = calculator.calculate({
      age: 30,
      sex: Sex.MALE,
      heightCm: 180,
      weightKg: 80,
      activityLevel: ActivityLevel.MODERATE,
    });

    expect(result.targets.caloriesKcal).toBe('2759');
    expect(result.targetProvenance).toEqual(expect.arrayContaining([expect.objectContaining({
      target: 'caloriesKcal',
      policyId: 'energy-maintenance-v1',
    }), expect.objectContaining({
      target: 'sodiumMilligrams',
      policyId: 'general-nutrition-sodium-v1',
    })]));
  });

  it('defers non-maintenance goals without inventing an adjustment', () => {
    const result = calculator.calculate({
      age: 30,
      sex: Sex.MALE,
      heightCm: 180,
      weightKg: 80,
      activityLevel: ActivityLevel.MODERATE,
      nutritionGoal: NutritionGoal.WEIGHT_LOSS,
    }, [], null, null, 'weight-loss');

    expect(result.targets.caloriesKcal).toBeUndefined();
    expect(result.energyGoal).toBe('weight-loss');
    expect(result.deferredPolicies).toContainEqual({
      policyId: 'energy-goal',
      reason: 'energy-goal-policy-pending',
      explanation: 'The weight-loss calorie adjustment policy has not been approved yet; maintenance energy remains the only implemented goal.',
    });
  });

  it('derives protein from weight and keeps the baseline sodium limit', () => {
    expect(calculator.calculate({ weightKg: 75 })).toEqual({
      targets: { sodiumMilligrams: '2300', proteinGrams: '60', saturatedFatGrams: '20', addedSugarGrams: '50', fiberGrams: '28' },
      adjustments: [],
      deferredPolicies: [],
      resolvedRules: expect.arrayContaining([expect.objectContaining({ policyId: 'general-nutrition-sodium-v1', kind: 'upper-limit', scopes: expect.arrayContaining(['meal']) })]),
      targetProvenance: expect.arrayContaining([expect.objectContaining({
        target: 'sodiumMilligrams',
        policyId: 'general-nutrition-sodium-v1',
      }), expect.objectContaining({
        target: 'saturatedFatGrams',
        policyId: 'general-nutrition-saturated-fat-v1',
      }), expect.objectContaining({
      target: 'addedSugarGrams',
      policyId: 'general-nutrition-added-sugars-v1',
      }), expect.objectContaining({
        target: 'fiberGrams',
        policyId: 'general-nutrition-fiber-v1',
      })]),
    });
  });

  it('does not activate the legacy universal cholesterol reference for current evaluations', () => {
    const result = calculator.calculate({ weightKg: 75 });

    expect(result.targets.cholesterolMilligrams).toBeUndefined();
    expect(result.targetProvenance ?? []).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'general-nutrition-cholesterol-v1' }),
    ]));
    expect(result.resolvedRules ?? []).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'general-nutrition-cholesterol-v1' }),
    ]));
  });

  it('defers diabetes carbohydrate guidance without an approved individualized target', () => {
    const result = calculator.calculate({ weightKg: 75 }, ['diabetes']);

    expect(result.targets.carbohydrateGrams).toBeUndefined();
    expect(result.deferredPolicies).toContainEqual({
      policyId: 'diabetes-carbohydrate-target-v1',
      reason: 'missing-individualized-carbohydrate-target',
      explanation: 'An approved individualized carbohydrate target is required for diabetes-specific carbohydrate guidance.',
    });
  });

  it('applies an approved individualized diabetes carbohydrate target', () => {
    const result = calculator.calculate({ weightKg: 75 }, ['diabetes'], null, null, 'maintenance', {
      userId: 'user-1',
      targetGrams: '180',
      approvalSource: 'CLINICIAN_APPROVED',
      sourceReference: 'care-plan-1',
      approvedAt: new Date('2026-08-17T00:00:00.000Z'),
      expiresAt: null,
    });

    expect(result.targets.carbohydrateGrams).toBe('180');
    expect(result.deferredPolicies).not.toContainEqual(expect.objectContaining({
      policyId: 'diabetes-carbohydrate-target-v1',
    }));
    expect(result.targetProvenance).toEqual(expect.arrayContaining([expect.objectContaining({
      target: 'carbohydrateGrams',
      policyId: 'diabetes-carbohydrate-target-v1',
    })]));
  });

  it('applies the cardiovascular saturated-fat target when maintenance energy is available', () => {
    const result = calculator.calculate({
      age: 30,
      sex: Sex.MALE,
      heightCm: 180,
      weightKg: 80,
      activityLevel: ActivityLevel.MODERATE,
    }, ['hypertension']);

    expect(result.targets.saturatedFatGrams).toBe('18.39');
    expect(result.deferredPolicies).toEqual([]);
    expect(result.targetProvenance).toEqual(expect.arrayContaining([
      expect.objectContaining({
        target: 'saturatedFatGrams',
        policyId: 'cardiovascular-saturated-fat-v1',
      }),
      expect.objectContaining({
        target: 'saturatedFatGrams',
        policyId: 'general-nutrition-saturated-fat-v1',
      }),
    ]));
  });

  it('leaves protein unavailable without profile weight', () => {
    expect(calculator.calculate(null)).toEqual({
      targets: { sodiumMilligrams: '2300', proteinGrams: null, saturatedFatGrams: '20', addedSugarGrams: '50', fiberGrams: '28' },
      adjustments: [],
      deferredPolicies: [],
      resolvedRules: expect.arrayContaining([expect.objectContaining({ policyId: 'general-nutrition-sodium-v1', kind: 'upper-limit' })]),
      targetProvenance: expect.arrayContaining([expect.objectContaining({
        target: 'sodiumMilligrams',
        policyId: 'general-nutrition-sodium-v1',
      }), expect.objectContaining({
        target: 'saturatedFatGrams',
        policyId: 'general-nutrition-saturated-fat-v1',
      }), expect.objectContaining({
      target: 'addedSugarGrams',
      policyId: 'general-nutrition-added-sugars-v1',
      }), expect.objectContaining({
        target: 'fiberGrams',
        policyId: 'general-nutrition-fiber-v1',
      })]),
    });
    expect(calculator.calculate({ weightKg: null })).toEqual({
      targets: { sodiumMilligrams: '2300', proteinGrams: null, saturatedFatGrams: '20', addedSugarGrams: '50', fiberGrams: '28' },
      adjustments: [],
      deferredPolicies: [],
      resolvedRules: expect.arrayContaining([expect.objectContaining({ policyId: 'general-nutrition-sodium-v1', kind: 'upper-limit' })]),
      targetProvenance: expect.arrayContaining([expect.objectContaining({
        target: 'sodiumMilligrams',
        policyId: 'general-nutrition-sodium-v1',
      }), expect.objectContaining({
        target: 'saturatedFatGrams',
        policyId: 'general-nutrition-saturated-fat-v1',
      }), expect.objectContaining({
      target: 'addedSugarGrams',
      policyId: 'general-nutrition-added-sugars-v1',
      }), expect.objectContaining({
        target: 'fiberGrams',
        policyId: 'general-nutrition-fiber-v1',
      })]),
    });
  });

  it('reports deferred CKD personalization when required evidence is missing', () => {
    expect(calculator.calculate(null, ['ckd']).deferredPolicies).toEqual([{
      policyId: 'ckd-phosphorus-v1',
      reason: 'missing-dialysis-status',
      explanation: 'Dialysis status is required to determine whether the CKD phosphorus policy applies to a dialysis or non-dialysis context.',
    }, {
      policyId: 'ckd-non-dialysis-protein-v1',
      reason: 'missing-weight',
      explanation: 'A current body weight is needed to personalize non-dialysis CKD protein guidance.',
    }]);
  });

  it('preserves decimal precision for weight-derived targets', () => {
    expect(calculator.calculate({ weightKg: 72.5 }).targets.proteinGrams).toBe('58');
  });

  it('adjusts sodium for hypertension and records exact provenance', () => {
    expect(calculator.calculate({ weightKg: 75 }, ['hypertension'])).toEqual({
      targets: { sodiumMilligrams: '1500', proteinGrams: '60', saturatedFatGrams: '20', addedSugarGrams: '50', fiberGrams: '28' },
      adjustments: [{
        target: 'sodiumMilligrams',
        from: '2300',
        to: '1500',
        reasonCode: 'cardiovascular-sodium-limit',
        explanation: 'The Cardiovascular policy takes precedence over the General Nutrition sodium reference for the supported hypertension context.',
        policyId: 'cardiovascular-sodium-v1',
        policyVersion: 'v1',
        conflictKey: 'nutrition-target:sodiumMilligrams:daily-upper-limit',
        precedence: 'condition-specific-over-general',
        provenance: expect.objectContaining({
          policyId: 'cardiovascular-sodium-v1',
        }),
        supportingProvenance: [expect.objectContaining({
          policyId: 'general-nutrition-sodium-v1',
        })],
      }],
      deferredPolicies: [{
        policyId: 'cardiovascular-saturated-fat-v1',
        reason: 'missing-maintenance-energy',
        explanation: 'A complete profile is needed to calculate the cardiovascular saturated-fat reference from maintenance energy; the General Nutrition reference remains active.',
      }],
      resolvedRules: expect.arrayContaining([
        expect.objectContaining({ policyId: 'cardiovascular-sodium-v1', measurementKey: 'sodium', unit: 'mg' }),
        expect.objectContaining({ policyId: 'general-nutrition-saturated-fat-v1', measurementKey: 'saturated-fat', unit: 'g' }),
        expect.objectContaining({ policyId: 'general-nutrition-added-sugars-v1', measurementKey: 'added-sugar', unit: 'g' }),
        expect.objectContaining({ policyId: 'general-nutrition-fiber-v1', measurementKey: 'fiber', unit: 'g' }),
      ]),
      targetProvenance: expect.arrayContaining([expect.objectContaining({
        target: 'sodiumMilligrams',
        policyId: 'general-nutrition-sodium-v1',
      }), expect.objectContaining({
        target: 'saturatedFatGrams',
        policyId: 'general-nutrition-saturated-fat-v1',
      }), expect.objectContaining({
      target: 'addedSugarGrams',
      policyId: 'general-nutrition-added-sugars-v1',
      }), expect.objectContaining({
        target: 'fiberGrams',
        policyId: 'general-nutrition-fiber-v1',
      })]),
    });
  });

  it('confirms the existing protein baseline for eligible non-dialysis CKD without a no-op adjustment', () => {
    expect(
      calculator.calculate(
        { weightKg: 75 },
        ['ckd'],
        {
          testCode: 'egfr',
          value: '45',
          unit: 'mL/min/1.73m²',
          collectedAt: new Date('2026-08-15T00:00:00.000Z'),
          status: 'reported',
          explanation: 'reported',
        },
        DialysisStatus.INACTIVE,
      ),
    ).toEqual({
      targets: { sodiumMilligrams: '2300', proteinGrams: '60', saturatedFatGrams: '20', addedSugarGrams: '50', fiberGrams: '28' },
      adjustments: [],
      deferredPolicies: [{
        policyId: 'ckd-phosphorus-v1',
        reason: 'missing-individualized-phosphorus-target',
        explanation: 'An approved individualized phosphorus limit is required before CKD-specific phosphorus guidance can be applied.',
      }],
      resolvedRules: expect.arrayContaining([
        expect.objectContaining({ policyId: 'general-nutrition-sodium-v1', kind: 'upper-limit' }),
        expect.objectContaining({ policyId: 'ckd-non-dialysis-protein-v1', kind: 'lower-target' }),
      ]),
      targetProvenance: expect.arrayContaining([expect.objectContaining({
        target: 'sodiumMilligrams',
        policyId: 'general-nutrition-sodium-v1',
      }), expect.objectContaining({
        target: 'saturatedFatGrams',
        policyId: 'general-nutrition-saturated-fat-v1',
      }), expect.objectContaining({
      target: 'addedSugarGrams',
      policyId: 'general-nutrition-added-sugars-v1',
      }), expect.objectContaining({
        target: 'fiberGrams',
        policyId: 'general-nutrition-fiber-v1',
      })]),
    });
  });

  it('does not apply the CKD policy when dialysis status is active or unknown', () => {
    const finding = {
      testCode: 'egfr',
      value: '45',
      unit: 'mL/min/1.73m²',
      collectedAt: new Date('2026-08-15T00:00:00.000Z'),
      status: 'reported' as const,
      explanation: 'reported',
    };
    expect(calculator.calculate({ weightKg: 75 }, ['ckd'], finding, DialysisStatus.ACTIVE).adjustments).toEqual([]);
    expect(calculator.calculate({ weightKg: 75 }, ['ckd'], finding, null).adjustments).toEqual([]);
  });

  it('composes the independent hemodialysis protein policy', () => {
    const result = calculator.calculate(
      { weightKg: 75 }, ['ckd'], null, DialysisStatus.ACTIVE, 'maintenance', null,
      new Date('2026-08-17T00:00:00.000Z'), DialysisModality.HEMODIALYSIS,
      new Date('2026-08-16T00:00:00.000Z'),
    );

    expect(result.targets.proteinGrams).toBe('75');
    expect(result.adjustments).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'hemodialysis-protein-v1' }),
    ]));
    expect(result.targetProvenance).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'hemodialysis-protein-v1' }),
    ]));
  });

  it('composes the independent peritoneal-dialysis protein policy', () => {
    const result = calculator.calculate(
      { weightKg: 75 }, ['ckd'], null, DialysisStatus.ACTIVE, 'maintenance', null,
      new Date('2026-08-17T00:00:00.000Z'), DialysisModality.PERITONEAL_DIALYSIS,
      new Date('2026-08-16T00:00:00.000Z'),
    );

    expect(result.targets.proteinGrams).toBe('75');
    expect(result.adjustments).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'peritoneal-dialysis-protein-v1' }),
    ]));
    expect(result.targetProvenance).toEqual(expect.arrayContaining([
      expect.objectContaining({ policyId: 'peritoneal-dialysis-protein-v1' }),
    ]));
  });
});
