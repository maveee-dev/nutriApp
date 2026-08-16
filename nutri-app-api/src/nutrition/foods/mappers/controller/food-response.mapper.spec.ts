import { FoodResponseMapper } from './food-response.mapper.js';

describe('FoodResponseMapper', () => {
  it('maps the food summary name from the source name', () => {
    const response = FoodResponseMapper.toFoodSummaryDto({
      id: 'food-id',
      name: 'Brown Rice',
      category: { id: 'category-id', name: 'Grains', description: null },
    });

    expect(response.name).toBe('Brown Rice');
  });
});
