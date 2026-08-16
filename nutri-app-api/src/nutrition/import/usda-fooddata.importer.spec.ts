import { UsdaFoodDataImporter } from '../../../prisma/import/usda-fooddata.importer.js';

describe('UsdaFoodDataImporter', () => {
  it('uses source identifiers and replaces imported relations transactionally on repeat imports', async () => {
    let categoryUpserts = 0;
    let foodUpserts = 0;
    let nutrientCreates = 0;
    let servingCreates = 0;
    const categories = new Map<string, { id: string; sourceId: string }>();
    const nutrients = new Map<string, { id: string; sourceId: string }>();
    const tx = {
      foodCategory: {
        findMany: async () => [...categories.values()],
        createMany: async ({ data }: { data: { sourceId: string }[] }) => {
          for (const item of data) categories.set(item.sourceId, { id: 'category-1', sourceId: item.sourceId });
        },
      },
      food: {
        upsert: async () => {
          foodUpserts += 1;
          return { id: 'food-1' };
        },
      },
      foodNutrient: {
        deleteMany: async () => undefined,
        create: async () => {
          nutrientCreates += 1;
        },
        createMany: async ({ data }: { data: unknown[] }) => {
          nutrientCreates += data.length;
        },
      },
      nutrient: {
        findMany: async () => [...nutrients.values()],
        createMany: async ({ data }: { data: { sourceId: string }[] }) => {
          for (const item of data) nutrients.set(item.sourceId, { id: 'nutrient-1', sourceId: item.sourceId });
        },
      },
      serving: {
        deleteMany: async () => undefined,
        createMany: async () => {
          servingCreates += 1;
        },
      },
      $transaction: async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx),
    };
    const importer = new UsdaFoodDataImporter(tx as never);
    const record = {
      source: 'usda-fdc' as const,
      sourceId: '123',
      name: 'Food',
      category: { sourceId: 'vegetables', name: 'Vegetables' },
      nutrients: [{ sourceId: '1003', name: 'Protein', unit: 'g', amountPer100Grams: '3' }],
      servings: [{ name: '1 cup', grams: '100' }],
    };

    await expect(importer.import([record, record])).resolves.toEqual({ imported: 2, failed: 0, failures: [] });
    expect(categoryUpserts).toBe(0);
    expect(foodUpserts).toBe(2);
    expect(nutrientCreates).toBe(2);
    expect(servingCreates).toBe(2);
  });
});
