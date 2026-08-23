import { tofoodDetailSource } from './food-repository.mapper.js';

describe('food repository mapper', () => {
  it('normalizes undetermined serving labels only in the presentation source', () => {
    const source = tofoodDetailSource({
      id: 'food-1',
      source: 'USDA_FOUNDATION',
      sourceId: 'fdc-1',
      name: 'Egg, whole, raw',
      description: null,
      planningClass: null,
      category: { id: 'category-1', name: 'Dairy and Egg Products', description: null },
      presentation: null,
      servings: [{ id: 'serving-1', name: '1 undetermined, egg', grams: '70' }],
      nutrients: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    expect(source.servings[0]).toMatchObject({ id: 'serving-1', name: '1 Egg', grams: '70' });
  });
});
