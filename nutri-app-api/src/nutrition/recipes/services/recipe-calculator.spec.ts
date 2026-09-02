import { jest } from '@jest/globals';
import { RecipeCalculator } from './recipe-calculator.js';

function food(id: string, protein: string, sodium: string) {
  return {
    id,
    name: id,
    category: { id: 'category-1', name: 'Test', description: null },
    servings: [{ id: `${id}-serving`, name: '1 serving', grams: '100' }],
    nutrients: [
      { nutrient: { id: `${id}-protein`, name: 'Protein', unit: 'g', sourceId: `${id}-protein` }, amount: protein },
      { nutrient: { id: `${id}-sodium`, name: 'Sodium', unit: 'mg', sourceId: `${id}-sodium` }, amount: sodium },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('RecipeCalculator', () => {
  it('scales canonical ingredients through the kernel and divides by recipe yield', async () => {
    const foodsService = {
      findDetailById: jest.fn().mockImplementation(async (id: string) => food(id, id === 'food-1' ? '20' : '10', id === 'food-1' ? '100' : '20')),
    };
    const calculator = new RecipeCalculator(foodsService as never);
    const result = await calculator.calculate({
      id: 'version-1', recipeId: 'recipe-1', version: 1, name: 'Test Bowl', description: null,
      preparationInstructions: null, cuisine: null, mealTypes: [], yieldServings: '2', sourceType: 'USER_CREATED',
      sourceName: null, sourceUrl: null, sourceReference: null, sourceVersion: null, approvalStatus: 'APPROVED',
      approvedAt: null, approvedByUserId: null, createdAt: new Date(), components: [
        { id: 'component-1', foodId: 'food-1', foodName: 'Food 1', servingId: 'food-1-serving', servingName: '1 serving', servingGrams: '100', role: 'INGREDIENT', quantity: '1', unit: 'SERVING', displayOrder: 0, notes: null },
        { id: 'component-2', foodId: 'food-2', foodName: 'Food 2', servingId: 'food-2-serving', servingName: '1 serving', servingGrams: '100', role: 'INGREDIENT', quantity: '2', unit: 'SERVING', displayOrder: 1, notes: null },
      ],
    });

    expect(result.servingGrams).toBe('150');
    expect(result.nutrients).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Protein', amount: '20' }),
      expect.objectContaining({ name: 'Sodium', amount: '70' }),
    ]));
    expect(foodsService.findDetailById).toHaveBeenCalledTimes(2);
  });
});
