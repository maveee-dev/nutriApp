import { describe, expect, it } from 'vitest';
import { toMealPlanCreateRequest, toMealPlanCreateRequestForMeal, type MealPlanItem, type MealPlanMeal } from './meal-plan.types';

describe('meal plan request mapping', () => {
  it('maps a confirmed plan item to the existing meal logging contract deterministically', () => {
    const item = {
      mealType: 'LUNCH',
      foodId: 'food-1',
      foodName: 'Beans',
      servingId: 'serving-1',
      servingName: '1 cup',
      servingGrams: '170',
      quantity: '1.5',
      category: 'Legumes',
      evaluation: { score: 90, coverage: 100, reasons: [], contributions: [] },
    } as MealPlanItem;

    expect(toMealPlanCreateRequest(item, '2026-08-19')).toEqual({
      mealType: 'LUNCH',
      consumedAt: '2026-08-19T12:00:00.000Z',
      items: [{ servingId: 'serving-1', quantity: '1.5' }],
    });
  });
});

describe('recipe/template meal mapping', () => {
  it('maps all recipe meal components to the existing meal logging contract', () => {
    const meal = {
      mealType: 'DINNER',
      name: 'Chicken Adobo',
      templateId: 'template-1',
      templateVersionId: 'template-version-1',
      templateVersion: 1,
      recipeVersionIds: ['recipe-version-1'],
      recipes: [{ recipeId: 'recipe-1', recipeVersionId: 'recipe-version-1', recipeVersion: 1, name: 'Chicken Adobo' }],
      slotSelections: [{ slotId: 'slot-1', source: 'recipe', sourceId: 'recipe-version-1', label: 'Chicken Adobo' }],
      components: [
        { mealType: 'DINNER', foodId: 'food-1', foodName: 'Chicken', servingId: 'serving-1', servingName: '1 cup', servingGrams: '140', quantity: '1', category: 'Poultry', evaluation: { score: 90, coverage: 100, reasons: [], contributions: [] } },
        { mealType: 'DINNER', foodId: 'food-2', foodName: 'Rice', servingId: 'serving-2', servingName: '1 cup', servingGrams: '158', quantity: '1', category: 'Grains', evaluation: { score: 90, coverage: 100, reasons: [], contributions: [] } },
      ],
      evaluation: { score: 90, coverage: 100, reasons: [], contributions: [] },
      provenance: { sourceType: 'CURATED', sourceName: 'NutriApp', sourceUrl: null, sourceReference: null, sourceVersion: '1', approvalStatus: 'APPROVED', evaluatorVersion: 'v1', policySetFingerprint: 'policy-1', evaluationFingerprint: 'evaluation-1' },
    } as MealPlanMeal;

    expect(toMealPlanCreateRequestForMeal(meal, '2026-08-19')).toEqual({
      mealType: 'DINNER',
      consumedAt: '2026-08-19T18:00:00.000Z',
      items: [
        { servingId: 'serving-1', quantity: '1' },
        { servingId: 'serving-2', quantity: '1' },
      ],
    });
  });
});
