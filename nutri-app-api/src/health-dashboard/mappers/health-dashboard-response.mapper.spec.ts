import { HealthDashboardResponseMapper } from './health-dashboard-response.mapper.js';

describe('HealthDashboardResponseMapper', () => {
  it('maps dates and preserves structured dashboard sections', () => {
    const response = HealthDashboardResponseMapper.toDto({
      greeting: { greeting: 'Good morning', displayName: 'Alex', date: '2026-08-31', profileSummary: { conditions: [], dialysis: null } },
      nutritionProgress: [{ nutrient: 'Protein', consumed: '20', target: '50', remaining: '30', unit: 'g', targetConfigured: true, percentageConsumed: 40, status: 'below-target' }],
      nutritionInsights: [],
      laboratorySummary: {
        latestReport: { id: 'report-1', reportDate: new Date('2026-08-30T00:00:00.000Z'), source: 'manual', createdAt: new Date('2026-08-30T01:00:00.000Z'), results: [], nutritionInsights: [], ignoredTestCodes: [] },
        importantResults: [],
        trends: [{ testCode: 'potassium', testName: 'Potassium', direction: 'insufficient-history', latest: { resultId: 'result-1', reportDate: new Date('2026-08-30T00:00:00.000Z'), value: '5.8', unit: 'mmol/L', status: 'high' }, previous: null, points: [] }],
        insights: [],
      },
      mealPlanner: { recommendation: null, remainingMeals: null },
      dailyFoods: [],
      compatibilitySummary: { averageScore: null, evaluated: 0, partiallyEvaluated: 0, insufficientEvidence: 0 },
      healthNotices: [],
    });

    expect(response.laboratorySummary.latestReport?.reportDate).toBe('2026-08-30');
    expect(response.laboratorySummary.trends[0]?.latest.reportDate).toBe('2026-08-30');
    expect(response.nutritionProgress[0]).toMatchObject({ nutrient: 'Protein', targetConfigured: true });
  });
});
