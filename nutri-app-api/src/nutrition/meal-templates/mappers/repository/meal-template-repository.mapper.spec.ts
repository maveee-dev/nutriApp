import { toMealTemplateSource } from './meal-template-repository.mapper.js';

function row() {
  return {
    id: 'template-1', ownerId: 'owner-1', visibility: 'SHARED', createdAt: new Date(), updatedAt: new Date(),
    versions: [
      {
        id: 'template-version-2', version: 2, name: 'Lunch pattern', description: null, cuisine: 'Filipino', mealTypes: ['LUNCH'], sourceType: 'OFFICIAL', sourceName: 'Test source', sourceUrl: null, sourceReference: null, sourceVersion: '1', approvalStatus: 'DRAFT', approvedAt: null, approvedByUserId: null, createdAt: new Date(),
        slots: [{ id: 'slot-1', role: 'MAIN_DISH', kind: 'PARAMETERIZED', name: 'Main Dish', required: true, allowCanonicalFoodFallback: false, displayOrder: 0, recipeVersionId: null, recipeVersion: null, foodId: null, food: null, servingId: null, serving: null, quantity: null, unit: null, notes: null }],
      },
      {
        id: 'template-version-1', version: 1, name: 'Lunch pattern', description: null, cuisine: 'Filipino', mealTypes: ['LUNCH'], sourceType: 'OFFICIAL', sourceName: 'Test source', sourceUrl: null, sourceReference: null, sourceVersion: '1', approvalStatus: 'APPROVED', approvedAt: new Date(), approvedByUserId: null, createdAt: new Date(), slots: [],
      },
    ],
  };
}

describe('meal template repository mapper', () => {
  it('filters unapproved versions for shared templates', () => {
    const source = toMealTemplateSource(row() as never, false);

    expect(source.versions.map(({ version }) => version)).toEqual([1]);
  });

  it('preserves structural slots without nutrient or compatibility fields', () => {
    const source = toMealTemplateSource(row() as never);
    const slot = source.versions[0]?.slots[0];

    expect(slot).toMatchObject({ role: 'MAIN_DISH', kind: 'PARAMETERIZED', required: true, name: 'Main Dish' });
    expect(slot).not.toHaveProperty('nutrients');
    expect(slot).not.toHaveProperty('score');
  });
});
