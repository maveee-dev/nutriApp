import { jest } from '@jest/globals';
import { RecommendationsController } from './recommendations.controller.js';
import { MealEvaluationSnapshotSource } from '../../../meals/sources/meal-evaluation-snapshot.source.js';

function snapshot(id: string, mealItemId: string): MealEvaluationSnapshotSource {
  return { id, mealItemId, score: 90, coverage: 100, payload: {}, evaluatorVersion: 'food-evaluation-v1', policyVersion: 'nutrition-policies-v1', snapshotVersion: '1', evaluatedAt: new Date('2026-08-19T12:00:00.000Z') };
}

describe('RecommendationsController', () => {
  it('exposes current-food recommendations with API and provenance metadata', async () => {
    const current = snapshot('snapshot-1', 'item-1');
    const recommendationService = { recommend: jest.fn().mockReturnValue({
      selected: [{ id: 'sodium-positive', category: 'positive', disposition: 'informational', severity: 'low', scope: 'current-food', title: 'Sodium is within the current limit', message: 'Within target.', nutrient: 'sodium', evidence: [{ id: 'e-1', kind: 'evaluation', source: { sourceType: 'meal-evaluation-snapshot', sourceId: 'snapshot-1', snapshotVersion: '1' }, field: 'reasons', value: '100', explanation: 'Evidence.' }], policy: { policyId: 'sodium-recommendation', version: 'sodium-recommendation-v1' } }],
      suppressed: [{ candidateId: 'duplicate', reason: 'duplicate', comparedWith: 'sodium-positive' }],
    }) };
    const repository = { findByIdForUser: jest.fn().mockResolvedValue(current) };
    const controller = new RecommendationsController(recommendationService as any, repository as any, {} as any);

    const response = await controller.currentFood({ sub: 'user-1', email: 'user@example.com' }, { id: 'snapshot-1' });

    expect(recommendationService.recommend).toHaveBeenCalledWith('user-1', current, 'current-food');
    expect(response).toMatchObject({ apiVersion: 'v1', scope: 'current-food', contextId: 'recommendations-snapshot-1', recommendations: [{ id: 'sodium-positive' }], suppressed: [{ reason: 'duplicate' }] });
    expect(response.recommendations[0].evidence[0].source.sourceId).toBe('snapshot-1');
  });

  it('exposes one resolution per latest meal-item snapshot for current-meal recommendations', async () => {
    const snapshots = [snapshot('snapshot-a', 'item-a'), snapshot('snapshot-b', 'item-b')];
    const recommendationService = { recommend: jest.fn((userId: string, item: MealEvaluationSnapshotSource, scope: string) => ({ selected: [{ id: `recommendation-${item.id}`, category: 'positive', disposition: 'informational', severity: 'low', scope, title: 'Positive', message: 'Good.', evidence: [], policy: { policyId: 'test', version: 'v1' } }], suppressed: [] })) };
    const repository = { findLatestForMealForUser: jest.fn().mockResolvedValue(snapshots) };
    const controller = new RecommendationsController(recommendationService as any, repository as any, {} as any);

    const response = await controller.currentMeal({ sub: 'user-1', email: 'user@example.com' }, { id: 'meal-1' });

    expect(recommendationService.recommend).toHaveBeenCalledTimes(2);
    expect(response).toMatchObject({ apiVersion: 'v1', scope: 'current-meal', mealId: 'meal-1', items: [{ mealItemId: 'item-a', snapshotId: 'snapshot-a' }, { mealItemId: 'item-b', snapshotId: 'snapshot-b' }] });
  });

  it('returns not-found when the user does not own the requested snapshot', async () => {
    const controller = new RecommendationsController({ recommend: jest.fn() } as any, { findByIdForUser: jest.fn().mockResolvedValue(null) } as any, {} as any);
    await expect(controller.currentFood({ sub: 'user-1', email: 'user@example.com' }, { id: 'missing' })).rejects.toMatchObject({ status: 404 });
  });

  it('exposes daily recommendations from the existing daily analysis projection', async () => {
    const recommendationService = { recommendDaily: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) };
    const analysisService = { getDailySummary: jest.fn().mockResolvedValue({ date: '2026-08-19' }) };
    const controller = new RecommendationsController(recommendationService as any, {} as any, analysisService as any);

    const response = await controller.daily({ sub: 'user-1', email: 'user@example.com' }, { date: '2026-08-19' });

    expect(analysisService.getDailySummary).toHaveBeenCalledWith('user-1', '2026-08-19');
    expect(recommendationService.recommendDaily).toHaveBeenCalledWith('user-1', { date: '2026-08-19' });
    expect(response).toMatchObject({ apiVersion: 'v1', scope: 'daily', contextId: 'recommendations-daily-user-1-2026-08-19', asOf: '2026-08-19T23:59:59.999Z' });
  });

  it('exposes historical recommendations from the existing weekly daily projections', async () => {
    const recommendationService = { recommendHistorical: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) };
    const analysisService = { getHistoricalSummary: jest.fn().mockResolvedValue({ startDate: '2026-08-12', endDate: '2026-08-18', days: [{ date: '2026-08-12' }] }) };
    const controller = new RecommendationsController(recommendationService as any, {} as any, analysisService as any);

    const response = await controller.historical({ sub: 'user-1', email: 'user@example.com' }, { startDate: '2026-08-12' });

    expect(analysisService.getHistoricalSummary).toHaveBeenCalledWith('user-1', '2026-08-12');
    expect(recommendationService.recommendHistorical).toHaveBeenCalledWith('user-1', [{ date: '2026-08-12' }]);
    expect(response).toMatchObject({ apiVersion: 'v1', scope: 'historical', contextId: 'recommendations-historical-user-1-2026-08-12-2026-08-18', asOf: '2026-08-18T23:59:59.999Z' });
  });

  it('exposes weekly recommendations from the existing weekly projection', async () => {
    const recommendationService = { recommendWeekly: jest.fn().mockReturnValue({ selected: [], suppressed: [] }) };
    const analysisService = { getWeeklySummary: jest.fn().mockResolvedValue({ startDate: '2026-08-12', endDate: '2026-08-18', days: [{ date: '2026-08-12' }] }) };
    const controller = new RecommendationsController(recommendationService as any, {} as any, analysisService as any);

    const response = await controller.weekly({ sub: 'user-1', email: 'user@example.com' }, { startDate: '2026-08-12' });

    expect(analysisService.getWeeklySummary).toHaveBeenCalledWith('user-1', '2026-08-12');
    expect(recommendationService.recommendWeekly).toHaveBeenCalledWith('user-1', [{ date: '2026-08-12' }], '2026-08-12', '2026-08-18');
    expect(response).toMatchObject({ apiVersion: 'v1', scope: 'weekly', contextId: 'recommendations-weekly-user-1-2026-08-12-2026-08-18', asOf: '2026-08-18T23:59:59.999Z' });
  });
});
