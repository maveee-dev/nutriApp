import { FoodResponseMapper } from './food-response.mapper.js';

describe('FoodResponseMapper', () => {
  it('maps the food summary name from the source name', () => {
    const response = FoodResponseMapper.toFoodSummaryDto({
      id: 'food-id',
      name: 'Brown Rice',
      category: { id: 'category-id', name: 'Grains', description: null },
    });

    expect(response.name).toBe('Brown Rice');
    expect(response.displayName).toBe('Brown Rice');
    expect(response.variantLabel).toBeNull();
  });

  it('keeps the canonical name while adding effective presentation fields', () => {
    const response = FoodResponseMapper.toFoodSummaryDto({
      id: 'food-1',
      name: 'Egg, whole, raw, frozen, pasteurized',
      category: { id: 'category-1', name: 'Dairy and Egg Products', description: null },
      displayName: 'Egg',
      variantLabel: 'Whole · Raw · Frozen · Pasteurized',
    });

    expect(response).toMatchObject({
      id: 'food-1',
      name: 'Egg, whole, raw, frozen, pasteurized',
      displayName: 'Egg',
      variantLabel: 'Whole · Raw · Frozen · Pasteurized',
    });
  });

  it('falls back to the canonical name for older sources without presentation fields', () => {
    const response = FoodResponseMapper.toFoodSummaryDto({
      id: 'food-2',
      name: 'Legacy food',
      category: { id: 'category-1', name: 'Food', description: null },
    });

    expect(response).toMatchObject({ name: 'Legacy food', displayName: 'Legacy food', variantLabel: null });
  });
});
