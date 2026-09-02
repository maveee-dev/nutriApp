import { HealthDashboardController } from './health-dashboard.controller.js';

describe('HealthDashboardController', () => {
  it('returns the mapped current dashboard', async () => {
    const service = { today: async () => ({ greeting: { greeting: 'Good morning', displayName: 'Alex', date: '2026-08-31', profileSummary: { conditions: [], dialysis: null } }, nutritionProgress: [], nutritionInsights: [], laboratorySummary: { latestReport: null, importantResults: [], trends: [], insights: [] }, mealPlanner: { recommendation: null, remainingMeals: null }, dailyFoods: [], compatibilitySummary: { averageScore: null, evaluated: 0, partiallyEvaluated: 0, insufficientEvidence: 0 }, healthNotices: [] }) };
    const controller = new HealthDashboardController(service as never);

    await expect(controller.today({ sub: 'user-1', email: 'alex@example.com' })).resolves.toMatchObject({
      greeting: { displayName: 'Alex' },
      nutritionProgress: [],
    });
  });
});
