import { jest } from '@jest/globals';
import { AiNutritionConsultationProviderAdapter } from './ai-nutrition-consultation-provider.adapter.js';

describe('AiNutritionConsultationProviderAdapter', () => {
  it('passes an allowlisted projection and returns the AI explanation without changing deterministic outputs', async () => {
    const aiService = {
      generateConsultation: jest.fn().mockResolvedValue({ answer: 'Explained.', providerId: 'gemini:test' }),
    };
    const adapter = new AiNutritionConsultationProviderAdapter(aiService as never);
    const deterministicResponse = {
      apiVersion: 'v1',
      assistantMode: 'deterministic-evidence' as const,
      question: 'Why is this recommended?',
      date: '2026-08-20',
      intent: 'recommendation-explanation',
      mealContext: 'available' as const,
      answer: 'Deterministic answer.',
      recommendations: {
        apiVersion: 'v1',
        scope: 'daily',
        contextId: 'context-1',
        asOf: '2026-08-20T12:00:00.000Z',
        recommendations: [{
          id: 'recommendation-1',
          category: 'education',
          disposition: 'recommend',
          severity: 'info',
          scope: 'daily',
          title: 'Keep logging',
          message: 'Continue logging meals.',
          evidence: [],
          policy: { policyId: 'policy-1', version: 'v1' },
        }],
        suppressed: [],
      },
      laboratoryEvidence: [{
        id: 'lab-1',
        testCode: 'egfr',
        value: '42',
        unit: 'mL/min/1.73m2',
        collectedAt: '2026-08-20T00:00:00.000Z',
        status: 'current' as const,
        source: 'manual-entry',
        usedByPolicies: [],
      }],
      foodEvaluation: {
        foodId: 'food-egg',
        displayName: 'Egg',
        variantLabel: 'Large',
        serving: { id: 'serving-egg', name: '1 large egg', grams: '50', quantity: '1' },
        evaluation: {
          score: 96,
          evaluationStatus: 'evaluated' as const,
          coverage: 100,
          reasons: [{ code: 'sodium-within-limit', direction: 'positive' as const, nutrient: 'sodium', measuredValue: '62', targetValue: '2300', explanation: 'Sodium is within the active limit.' }],
          contributions: [{ nutrient: 'protein', unit: 'g', amount: '6', targetValue: '60', currentDailyValue: null, explanation: 'Provides protein.' }],
          deferredPolicies: [],
        },
        targetCalculation: { targets: { sodiumMilligrams: '2300', proteinGrams: '60' }, adjustments: [], deferredPolicies: [], targetProvenance: [] },
        policySetFingerprint: 'policy-set-1',
      },
      limitations: ['Educational only.'],
    };

    const result = await adapter.explain({ deterministicResponse, conversation: [] });

    expect(result).toEqual({ answer: 'Explained.', providerId: 'gemini:test' });
    expect(aiService.generateConsultation).toHaveBeenCalledWith(expect.objectContaining({
      userConditions: [],
      labSummary: [expect.objectContaining({ testCode: 'egfr', value: '42' })],
      recommendations: [expect.objectContaining({ title: 'Keep logging' })],
      foodEvaluation: expect.objectContaining({
        displayName: 'Egg',
        serving: expect.objectContaining({ name: '1 large egg', grams: '50' }),
        compatibilityScore: 96,
        reasons: [expect.objectContaining({ direction: 'positive', measuredValue: '62' })],
        contributions: [expect.objectContaining({ nutrient: 'protein', unit: 'g', amount: '6' })],
      }),
      consultationType: 'recommendation-explanation',
    }));
  });
});
