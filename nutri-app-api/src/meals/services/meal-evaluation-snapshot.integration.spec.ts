import { MealsService } from './meals.service.js';
import { MealEvaluationSnapshotService } from './meal-evaluation-snapshot.service.js';

describe('meal evaluation snapshot lifecycle', () => {
  it('keeps the original snapshot unchanged when a later evaluation uses new targets', async () => {
    const snapshots: any[] = [];
    const snapshotRepository = {
      create: async (input: any) => {
        const snapshot = {
          id: `snapshot-${snapshots.length + 1}`,
          ...structuredClone(input),
        };
        snapshots.push(snapshot);
        return snapshot;
      },
    };

    let sodiumTarget = '2300';
    const evaluationService = {
      evaluateWithContext: async () => ({
        evaluation: {
          score: sodiumTarget === '2300' ? 90 : 75,
          coverage: 100,
          reasons: [{
            code: 'sodium-limit',
            direction: 'neutral',
            nutrient: 'sodium',
            measuredValue: '100',
            targetValue: sodiumTarget,
            explanation: `Sodium is evaluated against ${sodiumTarget} mg.`,
          }],
          contributions: [],
          deferredPolicies: [],
        },
        targetCalculation: {
          targets: { sodiumMilligrams: sodiumTarget },
          adjustments: [],
          deferredPolicies: [],
          energyGoal: 'maintenance',
          targetProvenance: [],
        },
      }),
    };

    const snapshotService = new MealEvaluationSnapshotService(
      evaluationService as any,
      snapshotRepository as any,
    );
    const mealsService = new MealsService(
      {
        create: async () => ({
          id: 'meal-1',
          mealType: 'BREAKFAST',
          consumedAt: new Date('2026-08-17T08:00:00.000Z'),
          items: [{
            id: 'item-1',
            food: { id: 'food-1', name: 'Food' },
            serving: { id: 'serving-1', name: '100 g', grams: '100' },
            quantity: '1',
          }],
        }),
      } as any,
      snapshotService,
    );

    const meal = await mealsService.create({
      userId: 'user-1',
      mealType: 'BREAKFAST' as any,
      consumedAt: new Date('2026-08-17T08:00:00.000Z'),
      items: [{ servingId: 'serving-1', quantity: '1' }],
    });

    const firstSnapshot = structuredClone(snapshots[0]);

    // A later profile/goal change produces a new evaluation, never an update.
    sodiumTarget = '1500';
    await snapshotService.captureForMealItem('user-1', meal.items[0]);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toEqual(firstSnapshot);
    expect(snapshots[1].id).not.toBe(snapshots[0].id);
    expect(snapshots[1].payload.targets.sodiumMilligrams).toBe('1500');
    expect(snapshots[1].score).toBe(75);
  });
});
