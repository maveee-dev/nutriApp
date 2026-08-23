import { ActivityLevel, Sex } from '../../../../../generated/prisma/client.js';
import { EnergyPolicy } from './energy.policy.js';

describe('EnergyPolicy', () => {
  const policy = new EnergyPolicy();

  it('derives a deterministic maintenance target and provenance', () => {
    expect(policy.calculate({
      age: 30,
      sex: Sex.MALE,
      heightCm: 180,
      weightKg: 80,
      activityLevel: ActivityLevel.MODERATE,
    })).toEqual({
      caloriesKcal: '2759',
      provenance: {
        target: 'caloriesKcal',
        policyId: 'energy-maintenance-v1',
        source: 'Mifflin-St Jeor equation with activity factor',
        version: 'v1',
        explanation: 'Estimated maintenance energy target: 2759 kcal/day. This is a deterministic estimate based on the profile and is not individualized medical advice.',
      },
    });
  });

  it('does not guess when required profile data is missing', () => {
    expect(policy.calculate({
      age: 30,
      sex: null,
      heightCm: 180,
      weightKg: 80,
      activityLevel: ActivityLevel.MODERATE,
    })).toEqual({ caloriesKcal: null, provenance: null });
  });

  it('defers unsupported future goal adjustments', () => {
    expect(policy.calculate({
      age: 30,
      sex: Sex.MALE,
      heightCm: 180,
      weightKg: 80,
      activityLevel: ActivityLevel.MODERATE,
    }, 'weight-loss')).toEqual({ caloriesKcal: null, provenance: null });
  });
});
