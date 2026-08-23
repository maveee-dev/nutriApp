import { jest } from '@jest/globals';
import { FoodRecognitionService } from './food-recognition.service.js';

describe('FoodRecognitionService', () => {
  it('matches recognized labels to canonical foods and preserves source boundaries', async () => {
    const foodsService = { findMany: jest.fn().mockResolvedValue({ items: [{ id: 'food-1', name: 'Salmon', category: { id: 'fish', name: 'Fish', description: null } }], meta: {} }) };
    const provider = {
      providerId: 'test-vision-v1',
      available: true,
      recognize: jest.fn().mockResolvedValue([{ label: 'salmon', confidence: 0.94 }]),
    };
    const service = new FoodRecognitionService(foodsService as never, provider);

    const result = await service.recognize({ imageData: 'encoded', mimeType: 'image/jpeg' });

    expect(result.candidates[0]).toMatchObject({ foodId: 'food-1', matchStatus: 'database-match', nutritionSource: 'canonical-database', requiresReview: false });
    expect(foodsService.findMany).toHaveBeenCalledWith({ page: 1, limit: 1, search: 'salmon' });
  });

  it('marks AI-estimated nutrition as review-required when no canonical match exists', async () => {
    const provider = {
      providerId: 'test-vision-v1',
      available: true,
      recognize: jest.fn().mockResolvedValue([{ label: 'unknown dish', confidence: 0.71, estimatedNutrition: [{ nutrient: 'protein', amount: '12', unit: 'g', basis: 'per estimated portion' }] }]),
    };
    const service = new FoodRecognitionService({ findMany: jest.fn().mockResolvedValue({ items: [], meta: {} }) } as never, provider);

    const result = await service.recognize({ imageData: 'encoded', mimeType: 'image/png' });

    expect(result.candidates[0]).toMatchObject({ matchStatus: 'ai-estimate', nutritionSource: 'ai-estimated', requiresReview: true });
    expect(result.candidates[0].estimatedNutrition?.[0].basis).toBe('per estimated portion');
  });

  it('returns an explicit unavailable result with the no-op provider', async () => {
    const provider = { providerId: 'none', available: false, recognize: jest.fn().mockResolvedValue([]) };
    const service = new FoodRecognitionService({ findMany: jest.fn() } as never, provider);
    const result = await service.recognize({ imageData: 'encoded', mimeType: 'image/webp' });
    expect(result).toMatchObject({ providerId: 'none', providerAvailable: false, candidates: [] });
    expect(result.limitations.join(' ')).toContain('not configured');
  });
});
