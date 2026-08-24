import { jest } from '@jest/globals';
import { AiService, AI_EDUCATIONAL_DISCLAIMER, AI_OUT_OF_SCOPE_MESSAGE, AI_CALCULATION_REFUSAL_MESSAGE } from './ai.service.js';

const prompt = {
  userConditions: [],
  labSummary: [],
  foodEvaluation: null,
  dailySummary: { date: '2026-08-20', deferredPolicies: [], adherence: [], replayLimitations: [] },
  recommendations: [],
  userQuestion: 'Why is this food recommended?',
  conversation: [],
};

describe('AiService', () => {
  it('delegates nutrition questions and adds the educational disclaimer', async () => {
    const provider = { generateConsultation: jest.fn().mockResolvedValue({ answer: 'Use the recorded guidance.', providerId: 'gemini:test' }) };
    const service = new AiService(provider);

    const result = await service.generateConsultation(prompt);

    expect(provider.generateConsultation).toHaveBeenCalledWith(prompt);
    expect(result.answer).toContain('Use the recorded guidance.');
    expect(result.answer).toContain(AI_EDUCATIONAL_DISCLAIMER);
  });

  it('refuses unrelated questions before calling the provider', async () => {
    const provider = { generateConsultation: jest.fn() };
    const service = new AiService(provider);

    const result = await service.generateConsultation({ ...prompt, userQuestion: 'Can you help me with programming?' });

    expect(provider.generateConsultation).not.toHaveBeenCalled();
    expect(result.refused).toBe(true);
    expect(result.answer).toContain(AI_OUT_OF_SCOPE_MESSAGE);
  });

  it('refuses vague non-nutrition questions instead of sending them to Gemini', async () => {
    const provider = { generateConsultation: jest.fn() };
    const service = new AiService(provider);

    const result = await service.generateConsultation({ ...prompt, userQuestion: 'What is the capital of France?' });

    expect(provider.generateConsultation).not.toHaveBeenCalled();
    expect(result.refused).toBe(true);
  });

  it('refuses requests to calculate nutrient values', async () => {
    const provider = { generateConsultation: jest.fn() };
    const service = new AiService(provider);

    const result = await service.generateConsultation({ ...prompt, userQuestion: 'Calculate my calories and protein total.' });

    expect(provider.generateConsultation).not.toHaveBeenCalled();
    expect(result.refused).toBe(true);
    expect(result.answer).toContain(AI_CALCULATION_REFUSAL_MESSAGE);
  });
});
