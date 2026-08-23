import { toRecipeSource } from './recipe-repository.mapper.js';

function row() {
  return {
    id: 'recipe-1',
    ownerId: 'owner-1',
    visibility: 'SHARED',
    createdAt: new Date('2026-08-20T00:00:00.000Z'),
    updatedAt: new Date('2026-08-20T00:00:00.000Z'),
    versions: [
      {
        id: 'version-2', version: 2, name: 'Dish v2', description: null, cuisine: 'Filipino', mealTypes: ['LUNCH'], yieldServings: { toString: () => '2' }, sourceType: 'OFFICIAL', sourceName: 'Test Source', sourceUrl: null, sourceReference: null, sourceVersion: '1', approvalStatus: 'DRAFT', approvedAt: null, approvedByUserId: null, createdAt: new Date(),
        components: [{ id: 'component-1', foodId: 'food-1', food: { id: 'food-1', name: 'Chicken' }, servingId: 'serving-1', serving: { id: 'serving-1', name: '1 serving', grams: { toString: () => '100' } }, role: 'MAIN_DISH', quantity: { toString: () => '1' }, unit: 'SERVING', displayOrder: 0, notes: null }],
      },
      {
        id: 'version-1', version: 1, name: 'Dish v1', description: null, cuisine: 'Filipino', mealTypes: ['LUNCH'], yieldServings: { toString: () => '2' }, sourceType: 'OFFICIAL', sourceName: 'Test Source', sourceUrl: null, sourceReference: null, sourceVersion: '1', approvalStatus: 'APPROVED', approvedAt: new Date(), approvedByUserId: null, createdAt: new Date(), components: [],
      },
    ],
  };
}

describe('recipe repository mapper', () => {
  it('does not expose unapproved versions of shared recipes', () => {
    const source = toRecipeSource(row() as never, false);

    expect(source.versions.map(({ version }) => version)).toEqual([1]);
    expect(source.versions[0]?.components[0]).toBeUndefined();
  });

  it('preserves canonical component references without nutrient duplication', () => {
    const source = toRecipeSource(row() as never);
    const component = source.versions[0]?.components[0];

    expect(component).toMatchObject({ foodId: 'food-1', servingId: 'serving-1', quantity: '1', unit: 'SERVING' });
    expect(component).not.toHaveProperty('nutrients');
  });
});
