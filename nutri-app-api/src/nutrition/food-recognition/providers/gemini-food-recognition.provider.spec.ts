import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { GeminiFoodRecognitionProvider } from './gemini-food-recognition.provider.js';

describe('GeminiFoodRecognitionProvider', () => {
  it('sends an image and parses only the allowlisted recognition projection', async () => {
    const generateContent = jest.fn().mockResolvedValue({
      text: JSON.stringify({
        imageQuality: { status: 'good', issues: [] },
        mealConfidence: 0.96,
        mealDescription: 'A bowl of rice.',
        detections: [{ label: 'white rice', confidence: 0.99, servingSuggestion: { label: '1 cup', grams: '158' } }],
      }),
    });
    const provider = new GeminiFoodRecognitionProvider(
      { models: { generateContent } } as never,
      new ConfigService({ geminiApiKey: 'test-key', geminiModel: 'gemini-test-model' }),
    );

    const response = await provider.recognize({ imageData: 'encoded-image', mimeType: 'image/jpeg' });

    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-test-model',
      config: expect.objectContaining({ temperature: 0, responseMimeType: 'application/json' }),
      contents: expect.arrayContaining([
        expect.objectContaining({
          parts: expect.arrayContaining([
            expect.objectContaining({ inlineData: { data: 'encoded-image', mimeType: 'image/jpeg' } }),
          ]),
        }),
      ]),
    }));
    expect(response).toEqual({
      imageQuality: { status: 'good', issues: [] },
      mealConfidence: 0.96,
      mealDescription: 'A bowl of rice.',
      detections: [{ label: 'white rice', confidence: 0.99, servingSuggestion: { label: '1 cup', grams: '158' } }],
    });
  });

  it('suppresses detections for poor images', async () => {
    const provider = new GeminiFoodRecognitionProvider(
      { models: { generateContent: jest.fn().mockResolvedValue({ text: JSON.stringify({
        imageQuality: { status: 'poor', issues: ['Too dark'] },
        mealConfidence: 0.2,
        mealDescription: null,
        detections: [{ label: 'rice', confidence: 0.9 }],
      }) }) } } as never,
      new ConfigService({ geminiApiKey: 'test-key' }),
    );

    await expect(provider.recognize({ imageData: 'encoded', mimeType: 'image/jpeg' })).resolves.toMatchObject({
      imageQuality: { status: 'poor' },
      detections: [],
    });
  });
});
