import { UsdaFoodDataImporter } from '../../../prisma/import/usda-fooddata.importer.js';

describe('UsdaFoodDataImporter', () => {
  const record = {
    source: 'usda-fdc' as const,
    sourceId: '123',
    name: 'Food',
    category: { sourceId: 'vegetables', name: 'Vegetables' },
    nutrients: [{ sourceId: '1003', name: 'Protein', unit: 'g', amountPer100Grams: '3' }],
    servings: [{ name: '1 cup', grams: '100' }],
  };

  function createState(existingServings: readonly any[] = []) {
    const categories = new Map<string, { id: string; sourceId: string }>();
    const nutrients = new Map<string, { id: string; sourceId: string }>();
    const servingCreates: any[] = [];
    const servingDeletes: string[] = [];
    const tx = {
      foodCategory: {
        findMany: async () => [...categories.values()],
        createMany: async ({ data }: { data: { sourceId: string }[] }) => {
          for (const item of data) categories.set(item.sourceId, { id: 'category-1', sourceId: item.sourceId });
        },
      },
      food: {
        upsert: async () => ({ id: 'food-1' }),
      },
      foodNutrient: {
        deleteMany: async () => undefined,
        createMany: async ({ data }: { data: unknown[] }) => data,
      },
      nutrient: {
        findMany: async () => [...nutrients.values()],
        createMany: async ({ data }: { data: { sourceId: string }[] }) => {
          for (const item of data) nutrients.set(item.sourceId, { id: 'nutrient-1', sourceId: item.sourceId });
        },
      },
      serving: {
        findMany: async () => existingServings,
        create: async ({ data }: { data: any }) => {
          servingCreates.push(data);
          return { id: `created-serving-${servingCreates.length}`, ...data };
        },
        delete: async ({ where }: { where: { id: string } }) => {
          servingDeletes.push(where.id);
        },
      },
      $transaction: async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx),
    };
    return {
      importer: new UsdaFoodDataImporter(tx as never),
      servingCreates,
      servingDeletes,
    };
  }

  it('preserves the existing serving ID when the logical serving is unchanged', async () => {
    const state = createState([{
      id: 'serving-existing',
      name: '  1   CUP ',
      grams: '100.00',
      _count: { mealItems: 0, recipeComponents: 0, mealTemplateSlots: 0 },
    }]);

    await expect(state.importer.import([record])).resolves.toEqual({ imported: 1, failed: 0, failures: [] });
    expect(state.servingCreates).toHaveLength(0);
    expect(state.servingDeletes).toHaveLength(0);
  });

  it('creates a new serving row for a genuinely new imported serving', async () => {
    const state = createState([{
      id: 'serving-existing',
      name: '1 cup',
      grams: '100',
      _count: { mealItems: 0, recipeComponents: 0, mealTemplateSlots: 0 },
    }]);

    await expect(state.importer.import([{
      ...record,
      servings: [...record.servings, { name: '1 tablespoon', grams: '15' }],
    }])).resolves.toEqual({ imported: 1, failed: 0, failures: [] });
    expect(state.servingCreates).toEqual([{ foodId: 'food-1', name: '1 tablespoon', grams: '15' }]);
  });

  it('deletes obsolete unreferenced servings', async () => {
    const state = createState([{
      id: 'serving-obsolete',
      name: '1 slice',
      grams: '25',
      _count: { mealItems: 0, recipeComponents: 0, mealTemplateSlots: 0 },
    }]);

    await expect(state.importer.import([record])).resolves.toEqual({ imported: 1, failed: 0, failures: [] });
    expect(state.servingDeletes).toEqual(['serving-obsolete']);
  });

  it.each([
    ['MealItem', 'mealItems'],
    ['RecipeComponent', 'recipeComponents'],
    ['MealTemplateSlot', 'mealTemplateSlots'],
  ])('retains obsolete servings referenced by %s without failing the import', async (_label, reference) => {
    const counts = { mealItems: 0, recipeComponents: 0, mealTemplateSlots: 0 };
    counts[reference as keyof typeof counts] = 1;
    const state = createState([{
      id: 'serving-obsolete',
      name: '1 slice',
      grams: '25',
      _count: counts,
    }]);

    await expect(state.importer.import([record])).resolves.toEqual({ imported: 1, failed: 0, failures: [] });
    expect(state.servingDeletes).toHaveLength(0);
    expect(state.servingCreates).toEqual([{ foodId: 'food-1', name: '1 cup', grams: '100' }]);
  });
});
