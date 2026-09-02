import { jest } from '@jest/globals';
import { AiNutritionConsultationService } from './ai-nutrition-consultation.service.js';
import { ConsultationIntentRouter } from './consultation-intent.router.js';

const deterministic = {
  apiVersion: 'v1',
  assistantMode: 'deterministic-evidence' as const,
  question: 'What should I improve?',
  date: '2026-08-19',
  intent: 'daily-improvement',
  mealContext: 'available' as const,
  answer: 'Keep going.',
  recommendations: { apiVersion: 'v1', scope: 'daily', contextId: 'context-1', asOf: '2026-08-19T23:59:59.999Z', recommendations: [], suppressed: [] },
  laboratoryEvidence: [],
  limitations: ['Do not diagnose.'],
};

describe('AiNutritionConsultationService', () => {
  it('preserves deterministic evidence while adding a separate explanation', async () => {
    const provider = { explain: jest.fn().mockResolvedValue({ answer: 'Here is a warmer explanation.', providerId: 'test-provider-v1' }) };
    const service = new AiNutritionConsultationService({ consult: jest.fn().mockResolvedValue(deterministic) } as never, provider);

    const result = await service.consult('user-1', 'What should I improve?');

    expect(result.answer).toBe(deterministic.answer);
    expect(result.aiExplanation).toBe('Here is a warmer explanation.');
    expect(result.assistantMode).toBe('ai-assisted');
    expect(result.aiAssisted).toBe(true);
    expect(result.aiProvider).toBe('test-provider-v1');
    expect(result.recommendations).toBe(deterministic.recommendations);
    expect(result.limitations).toBe(deterministic.limitations);
    expect(provider.explain).toHaveBeenCalledWith(expect.objectContaining({ deterministicResponse: deterministic }));
  });

  it('returns the deterministic response unchanged when no provider is available', async () => {
    const provider = { explain: jest.fn().mockResolvedValue(null) };
    const service = new AiNutritionConsultationService({ consult: jest.fn().mockResolvedValue(deterministic) } as never, provider);
    await expect(service.consult('user-1', 'What should I improve?')).resolves.toBe(deterministic);
  });

  it('falls back when a provider fails and preserves follow-up context input', async () => {
    const provider = { explain: jest.fn().mockRejectedValue(new Error('provider unavailable')) };
    const service = new AiNutritionConsultationService({ consult: jest.fn().mockResolvedValue(deterministic) } as never, provider);
    const conversation = [{ role: 'user' as const, content: 'Why?' }];

    await expect(service.consult('user-1', 'Can you explain?', undefined, conversation)).resolves.toBe(deterministic);
    expect(provider.explain).toHaveBeenCalledWith(expect.objectContaining({ conversation }));
  });

  it('rejects unsafe AI clinical language and preserves the deterministic response', async () => {
    const provider = { explain: jest.fn().mockResolvedValue({ answer: 'You should change your medication dose immediately.', providerId: 'unsafe-provider-v1' }) };
    const service = new AiNutritionConsultationService({ consult: jest.fn().mockResolvedValue(deterministic) } as never, provider);

    await expect(service.consult('user-1', 'What should I improve?')).resolves.toBe(deterministic);
  });

  it('returns deterministic evidence unchanged when the provider refuses', async () => {
    const provider = { explain: jest.fn().mockResolvedValue({ answer: 'I cannot explain this.', providerId: 'test-provider-v1', refused: true }) };
    const service = new AiNutritionConsultationService({ consult: jest.fn().mockResolvedValue(deterministic) } as never, provider);

    await expect(service.consult('user-1', 'Why is sodium important?')).resolves.toBe(deterministic);
  });

  it.each([
    ['Who created you?', 'Maverich Co.'],
    ['Calculate my protein total.', 'can\'t calculate or estimate'],
    ['Can you help me with programming?', 'nutrition assistant'],
  ])('does not invoke AI for deterministic %s routing', async (question, expectedText) => {
    const provider = { explain: jest.fn() };
    const service = new AiNutritionConsultationService(
      { consult: jest.fn().mockResolvedValue(deterministic) } as never,
      provider,
      new ConsultationIntentRouter(),
    );

    const result = await service.consult('user-1', question);

    expect(provider.explain).not.toHaveBeenCalled();
    expect(result.assistantMode).toBe('deterministic-evidence');
    expect(result.aiAssisted).toBe(false);
    expect(result.answer).toContain(expectedText);
  });

  it('continues to invoke the provider for an allowed conversational lane', async () => {
    const provider = { explain: jest.fn().mockResolvedValue({ answer: 'A clear explanation.', providerId: 'test-provider-v1' }) };
    const service = new AiNutritionConsultationService(
      { consult: jest.fn().mockResolvedValue(deterministic) } as never,
      provider,
      new ConsultationIntentRouter(),
    );

    await service.consult('user-1', 'Why is sodium important?');

    expect(provider.explain).toHaveBeenCalledTimes(1);
  });

  it.each(['ambiguous', 'not-found'] as const)('does not invoke AI for %s food resolution', async (status) => {
    const provider = { explain: jest.fn() };
    const deterministicResponse = {
      ...deterministic,
      foodResolution: {
        status,
        query: 'Can I eat egg?',
        candidates: [],
      },
    };
    const service = new AiNutritionConsultationService(
      { consult: jest.fn().mockResolvedValue(deterministicResponse) } as never,
      provider,
      new ConsultationIntentRouter(),
    );

    const result = await service.consult('user-1', 'Can I eat egg?');

    expect(result).toBe(deterministicResponse);
    expect(provider.explain).not.toHaveBeenCalled();
  });

  it('adds an AI explanation for evaluated food evidence without replacing the deterministic answer', async () => {
    const provider = { explain: jest.fn().mockResolvedValue({ answer: 'Based on the supplied evidence, this food fits your active guidance.', providerId: 'test-provider-v1' }) };
    const deterministicResponse = {
      ...deterministic,
      answer: 'Deterministic food answer.',
      foodResolution: { status: 'resolved' as const, query: 'Can I eat egg?', candidates: [{ kind: 'food' as const, foodId: 'egg-1', displayName: 'Egg', variantLabel: null, matchType: 'display-exact' as const, confidence: 'high' as const }] },
      foodEvaluation: { foodId: 'egg-1' },
    };
    const service = new AiNutritionConsultationService(
      { consult: jest.fn().mockResolvedValue(deterministicResponse) } as never,
      provider,
      new ConsultationIntentRouter(),
    );

    const result = await service.consult('user-1', 'Can I eat egg?');

    expect(provider.explain).toHaveBeenCalledTimes(1);
    expect(result.answer).toBe('Deterministic food answer.');
    expect(result.aiExplanation).toBe('Based on the supplied evidence, this food fits your active guidance.');
    expect(result.recommendations).toBe(deterministicResponse.recommendations);
  });

  it('rejects an AI explanation that restates a different authoritative recipe score', async () => {
    const provider = { explain: jest.fn().mockResolvedValue({ answer: 'This recipe scores 86/100.', providerId: 'test-provider-v1' }) };
    const deterministicResponse = {
      ...deterministic,
      answer: 'Deterministic recipe answer.',
      foodResolution: { status: 'resolved' as const, query: 'Can I eat my chicken adobo?', candidates: [{ kind: 'approved-recipe' as const, recipeId: 'recipe-1', recipeVersionId: 'version-1', displayName: 'Chicken Adobo', variantLabel: null, matchType: 'recipe-exact' as const, confidence: 'high' as const }] },
      recipeEvaluation: { evaluation: { score: 84 } },
    };
    const service = new AiNutritionConsultationService(
      { consult: jest.fn().mockResolvedValue(deterministicResponse) } as never,
      provider,
      new ConsultationIntentRouter(),
    );

    await expect(service.consult('user-1', 'Can I eat my chicken adobo?')).resolves.toBe(deterministicResponse);
  });
});
