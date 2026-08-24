import { jest } from '@jest/globals';
import { NutritionAnalysisService } from './nutrition-analysis.service.js';
import { NutritionCalculator } from './nutrition-calculator.js';
import type { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';

function snapshot(): MealEvaluationSnapshotSource {
  return {
    id: 'characterization-snapshot-1',
    mealItemId: 'characterization-meal-item-1',
    score: 92,
    coverage: 100,
    evaluatorVersion: 'food-evaluation-v3',
    policyVersion: 'nutrition-policies-v1',
    snapshotVersion: '1',
    evaluatedAt: new Date('2026-08-12T12:00:00.000Z'),
    payload: {
      reasons: [],
      contributions: [
        { nutrient: 'calories', unit: 'kcal', amount: '100', targetValue: null, currentDailyValue: null, explanation: 'Calories contribution.' },
        { nutrient: 'potassium', unit: 'mg', amount: '250', targetValue: null, currentDailyValue: null, explanation: 'Potassium contribution.' },
        { nutrient: 'phosphorus', unit: 'mg', amount: '100', targetValue: null, currentDailyValue: null, explanation: 'Phosphorus contribution.' },
        { nutrient: 'protein', unit: 'g', amount: '10', targetValue: null, currentDailyValue: null, explanation: 'Protein contribution.' },
        { nutrient: 'sodium', unit: 'mg', amount: '120', targetValue: '2300', currentDailyValue: null, explanation: 'Sodium contribution.' },
      ],
      evaluationStatus: 'evaluated',
      targets: { sodiumMilligrams: '2300', proteinGrams: null },
      deferredPolicies: [],
      policySetFingerprint: 'characterization-policy-set',
      snapshotFingerprint: 'characterization-snapshot-fingerprint',
    },
  };
}

describe('NutritionAnalysisService historical replay characterization', () => {
  it('replays stored snapshot contributions without consulting current policy state', async () => {
    const currentPolicyCalculation = jest.fn();
    const repository = {
      findMealsForDateRange: jest.fn().mockResolvedValue([{
        id: 'characterization-meal-1',
        consumedAt: new Date('2026-08-12T12:00:00.000Z'),
        items: [],
      }]),
    };
    const snapshots = [snapshot()];
    const snapshotRepository = { findForUserDateRange: jest.fn().mockResolvedValue(snapshots) };
    const service = new NutritionAnalysisService(
      repository as never,
      new NutritionCalculator(),
      { calculateForUser: currentPolicyCalculation } as never,
      snapshotRepository as never,
      [],
    );

    const first = await service.getHistoricalSummary('user-1', '2026-08-12');
    const second = await service.getHistoricalSummary('user-1', '2026-08-12');

    expect(first).toEqual(second);
    expect(currentPolicyCalculation).not.toHaveBeenCalled();
    expect(first.days[0]).toMatchObject({
      evaluationMode: 'historical-replay',
      totals: [
        { name: 'calories', unit: 'kcal', amount: '100' },
        // Characterizes the current replay fallback: only sodium and
        // cholesterol are inferred as milligrams; other nutrients default to g.
        { name: 'phosphorus', unit: 'g', amount: '100' },
        { name: 'potassium', unit: 'g', amount: '250' },
        { name: 'protein', unit: 'g', amount: '10' },
        { name: 'sodium', unit: 'mg', amount: '120' },
      ],
      snapshotIds: ['characterization-snapshot-1'],
      evaluatorVersions: ['food-evaluation-v3'],
      policySetFingerprints: ['characterization-policy-set'],
      snapshotFingerprints: ['characterization-snapshot-fingerprint'],
    });
  });

  it('uses Kernel aggregation for unit-complete version 2 snapshots', async () => {
    const makeSnapshot = (id: string, mealItemId: string, contributions: readonly Record<string, unknown>[]): MealEvaluationSnapshotSource => ({
      ...snapshot(),
      id,
      mealItemId,
      snapshotVersion: '2',
      payload: {
        ...snapshot().payload,
        contributions,
      },
    });
    const service = new NutritionAnalysisService(
      { findMealsForDateRange: jest.fn().mockResolvedValue([]) } as never,
      new NutritionCalculator(),
      { calculateForUser: jest.fn() } as never,
      {
        findForUserDateRange: jest.fn().mockResolvedValue([
          makeSnapshot('v2-snapshot-1', 'item-1', [
            { nutrient: 'sodium', unit: 'mg', amount: '0.1', targetValue: null, currentDailyValue: null, explanation: 'Sodium.' },
            { nutrient: 'protein', unit: 'g', amount: '1.1', targetValue: null, currentDailyValue: null, explanation: 'Protein.' },
          ]),
          makeSnapshot('v2-snapshot-2', 'item-2', [
            { nutrient: 'sodium', unit: 'mg', amount: '0.2', targetValue: null, currentDailyValue: null, explanation: 'Sodium.' },
            { nutrient: 'protein', unit: 'g', amount: '0.2', targetValue: null, currentDailyValue: null, explanation: 'Protein.' },
          ]),
        ]),
      } as never,
      [],
    );

    const summary = await service.getHistoricalSummary('user-1', '2026-08-12');

    expect(summary.days[0]?.totals).toEqual([
      { name: 'protein', unit: 'g', amount: '1.3' },
      { name: 'sodium', unit: 'mg', amount: '0.3' },
    ]);
  });

  it('keeps mixed legacy and unit-aware snapshots on the legacy replay path', async () => {
    const legacy = snapshot();
    const unitAware: MealEvaluationSnapshotSource = {
      ...snapshot(),
      id: 'v2-snapshot',
      mealItemId: 'item-2',
      snapshotVersion: '2',
      payload: {
        ...snapshot().payload,
        contributions: [{ nutrient: 'phosphorus', unit: 'mg', amount: '100', targetValue: null, currentDailyValue: null, explanation: 'Phosphorus.' }],
      },
    };
    const service = new NutritionAnalysisService(
      { findMealsForDateRange: jest.fn().mockResolvedValue([]) } as never,
      new NutritionCalculator(),
      { calculateForUser: jest.fn() } as never,
      { findForUserDateRange: jest.fn().mockResolvedValue([legacy, unitAware]) } as never,
      [],
    );

    const summary = await service.getHistoricalSummary('user-1', '2026-08-12');

    expect(summary.days[0]?.totals).toEqual(expect.arrayContaining([
      { name: 'phosphorus', unit: 'g', amount: '200' },
      { name: 'sodium', unit: 'mg', amount: '120' },
    ]));
  });
});
