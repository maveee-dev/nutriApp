import { jest } from '@jest/globals';
import { PersonalizedRecommendationController } from './personalized-recommendation.controller.js';

describe('PersonalizedRecommendationController', () => {
  it('maps the authenticated recommendation request to the service response', async () => {
    const source = { date: '2026-08-31', goal: 'BALANCED', mealType: null, recommendations: [], remainingBudget: {}, laboratoryConsiderations: [], profileConsiderations: [], limitations: [], provenance: { foodSource: 'canonical-food-database', selection: 'deterministic', evaluatorVersion: 'food-evaluation-v3', policySetFingerprint: null, activeTargetIds: [] } };
    const service = { recommend: jest.fn().mockResolvedValue(source) };
    const controller = new PersonalizedRecommendationController(service as never);

    const result = await controller.recommendations({ sub: 'user-1' } as never, { goal: 'balanced' });

    expect(service.recommend).toHaveBeenCalledWith('user-1', { goal: 'balanced' });
    expect(result).toMatchObject({ date: '2026-08-31', goal: 'BALANCED', recommendations: [] });
  });
});
