import { jest } from '@jest/globals';
import { AiNutritionConsultationService } from './ai-nutrition-consultation.service.js';

const deterministic = {
  apiVersion: 'v1',
  assistantMode: 'deterministic-evidence' as const,
  question: 'What should I improve?',
  date: '2026-08-19',
  intent: 'daily-improvement',
  answer: 'Keep going.',
  recommendations: { apiVersion: 'v1', scope: 'daily', contextId: 'context-1', asOf: '2026-08-19T23:59:59.999Z', recommendations: [], suppressed: [] },
  laboratoryEvidence: [],
  limitations: ['Do not diagnose.'],
};

describe('AiNutritionConsultationService', () => {
  it('preserves deterministic evidence while replacing only the explanation', async () => {
    const provider = { explain: jest.fn().mockResolvedValue({ answer: 'Here is a warmer explanation.', providerId: 'test-provider-v1' }) };
    const service = new AiNutritionConsultationService({ consult: jest.fn().mockResolvedValue(deterministic) } as never, provider);

    const result = await service.consult('user-1', 'What should I improve?');

    expect(result.answer).toBe('Here is a warmer explanation.');
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
});
