import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { GeminiProvider } from './gemini.provider.js';

describe('GeminiProvider', () => {
  it('uses the official SDK with the structured consultation prompt', async () => {
    const generateContent = jest.fn().mockResolvedValue({ text: 'Use the supplied guidance.' });
    const client = { models: { generateContent } };
    const provider = new GeminiProvider(
      client as never,
      new ConfigService({ geminiModel: 'gemini-test-model' }),
    );

    const result = await provider.generateConsultation({
      userConditions: ['Diabetes'],
      labSummary: [],
      foodEvaluation: null,
      dailySummary: { date: '2026-08-20', deferredPolicies: [], adherence: [], replayLimitations: [] },
      recommendations: [],
      userQuestion: 'Why is this meal recommended?',
      conversation: [],
    });

    expect(result).toEqual({ answer: 'Use the supplied guidance.', providerId: 'gemini:gemini-test-model' });
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-test-model',
      contents: expect.stringContaining('Why is this meal recommended?'),
      config: expect.objectContaining({ temperature: 0.1 }),
    }));
  });

  it('rejects an empty provider response', async () => {
    const client = { models: { generateContent: jest.fn().mockResolvedValue({ text: '  ' }) } };
    const provider = new GeminiProvider(client as never, new ConfigService({ geminiModel: 'gemini-test-model' }));

    await expect(provider.generateConsultation({
      userConditions: [],
      labSummary: [],
      foodEvaluation: null,
      dailySummary: { date: '2026-08-20', deferredPolicies: [], adherence: [], replayLimitations: [] },
      recommendations: [],
      userQuestion: 'Explain this food.',
      conversation: [],
    })).rejects.toThrow('Gemini returned no consultation text.');
  });
});
