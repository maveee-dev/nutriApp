import { NutrientResponseMapper } from './nutrient-response.mapper.js';

describe('NutrientResponseMapper', () => {
  it('maps the nutrient description from the source description', () => {
    const response = NutrientResponseMapper.ToNutrientDto({
      id: 'nutrient-id',
      name: 'Sodium',
      unit: 'mg',
      description: 'Dietary sodium amount',
    });

    expect(response.description).toBe('Dietary sodium amount');
  });
});
