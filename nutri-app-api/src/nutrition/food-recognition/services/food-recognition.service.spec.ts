import { jest } from '@jest/globals';
import { FoodRecognitionService } from './food-recognition.service.js';

function result(overrides: Record<string, unknown> = {}) {
  return {
    imageQuality: { status: 'good' as const, issues: [] },
    mealConfidence: 0.94,
    mealDescription: 'A plate containing salmon and rice.',
    detections: [{ label: 'salmon', confidence: 0.94 }],
    ...overrides,
  };
}

describe('FoodRecognitionService', () => {
  it('matches recognized labels through the shared deterministic resolver', async () => {
    const resolver = {
      resolveFoodLabel: jest.fn().mockResolvedValue({
        status: 'resolved',
        query: 'salmon',
        candidates: [{
          kind: 'food',
          stableId: 'food-1',
          foodId: 'food-1',
          displayName: 'Salmon',
          variantLabel: 'Atlantic · Farmed',
          canonicalName: 'Fish, salmon, Atlantic, farmed',
          matchType: 'display-exact',
          confidence: 'high',
        }],
      }),
    };
    const provider = {
      providerId: 'test-vision-v1',
      available: true,
      recognize: jest.fn().mockResolvedValue(result()),
    };
    const service = new FoodRecognitionService(resolver as never, provider);

    const response = await service.recognize({ imageData: 'encoded', mimeType: 'image/jpeg' });

    expect(response).toMatchObject({
      recognitionStatus: 'completed',
      imageQuality: { status: 'good' },
      mealConfidence: 0.94,
      mealDescription: 'A plate containing salmon and rice.',
    });
    expect(response.candidates[0]).toMatchObject({
      foodId: 'food-1',
      foodName: 'Fish, salmon, Atlantic, farmed',
      matchStatus: 'database-match',
      resolutionStatus: 'matched',
      nutritionSource: 'canonical-database',
      requiresReview: false,
    });
    expect(resolver.resolveFoodLabel).toHaveBeenCalledWith('salmon');
  });

  it('returns alternatives and requires review for an ambiguous catalog match', async () => {
    const resolver = {
      resolveFoodLabel: jest.fn().mockResolvedValue({
        status: 'ambiguous',
        query: 'egg',
        candidates: [
          { kind: 'food', foodId: 'egg-1', stableId: 'egg-1', displayName: 'Egg', variantLabel: null, canonicalName: 'Egg, whole', matchType: 'display-exact', confidence: 'high' },
          { kind: 'food', foodId: 'egg-2', stableId: 'egg-2', displayName: 'Egg', variantLabel: 'Duck', canonicalName: 'Egg, duck', matchType: 'display-exact', confidence: 'high' },
        ],
        clarification: {
          message: 'Please choose the food you mean.',
          choices: [],
        },
      }),
    };
    const provider = {
      providerId: 'test-vision-v1',
      available: true,
      recognize: jest.fn().mockResolvedValue(result({ detections: [{ label: 'egg', confidence: 0.96 }] })),
    };
    const service = new FoodRecognitionService(resolver as never, provider);

    const response = await service.recognize({ imageData: 'encoded', mimeType: 'image/jpeg' });

    expect(response.candidates[0]).toMatchObject({
      foodId: null,
      matchStatus: 'ambiguous',
      resolutionStatus: 'ambiguous',
      requiresReview: true,
      alternatives: [
        { foodId: 'egg-1', displayName: 'Egg' },
        { foodId: 'egg-2', displayName: 'Egg', variantLabel: 'Duck' },
      ],
    });
  });

  it('does not match detections from a poor-quality image', async () => {
    const resolver = { resolveFoodLabel: jest.fn() };
    const provider = {
      providerId: 'test-vision-v1',
      available: true,
      recognize: jest.fn().mockResolvedValue(result({
        imageQuality: { status: 'poor', issues: ['The image is too blurry.'] },
        detections: [{ label: 'salmon', confidence: 0.94 }],
      })),
    };
    const service = new FoodRecognitionService(resolver as never, provider);

    const response = await service.recognize({ imageData: 'encoded', mimeType: 'image/jpeg' });

    expect(response.candidates).toEqual([]);
    expect(response.imageQuality).toEqual({ status: 'poor', issues: ['The image is too blurry.'] });
    expect(resolver.resolveFoodLabel).not.toHaveBeenCalled();
  });

  it('never exposes AI nutrition as a source for evaluation', async () => {
    const resolver = {
      resolveFoodLabel: jest.fn().mockResolvedValue({ status: 'not-found', query: 'unknown', candidates: [] }),
    };
    const provider = {
      providerId: 'test-vision-v1',
      available: true,
      recognize: jest.fn().mockResolvedValue(result({ detections: [{ label: 'unknown dish', confidence: 0.71 }] })),
    };
    const service = new FoodRecognitionService(resolver as never, provider);

    const response = await service.recognize({ imageData: 'encoded', mimeType: 'image/png' });

    expect(response.candidates[0]).toMatchObject({
      matchStatus: 'unmatched',
      nutritionSource: null,
      requiresReview: true,
    });
    expect(response.candidates[0]).not.toHaveProperty('estimatedNutrition');
  });

  it('returns an explicit unavailable result without calling an unavailable provider', async () => {
    const resolver = { resolveFoodLabel: jest.fn() };
    const provider = { providerId: 'none', available: false, recognize: jest.fn() };
    const service = new FoodRecognitionService(resolver as never, provider);

    const response = await service.recognize({ imageData: 'encoded', mimeType: 'image/webp' });

    expect(response).toMatchObject({
      providerId: 'none',
      providerAvailable: false,
      recognitionStatus: 'unavailable',
      candidates: [],
    });
    expect(provider.recognize).not.toHaveBeenCalled();
  });
});
