import { PrismaClient } from '../../generated/prisma/client.js';
import { ImportedFoodRecord } from './usda-fooddata.types.js';

export interface ImportSummary {
  readonly imported: number;
  readonly failed: number;
  readonly failures: readonly { sourceId: string; message: string }[];
}

export class UsdaFoodDataImporter {
  constructor(private readonly prisma: PrismaClient) {}

  async import(records: readonly ImportedFoodRecord[]): Promise<ImportSummary> {
    let imported = 0;
    const failures: { sourceId: string; message: string }[] = [];
    const categoryIds = await this.prepareCategories(records);
    const nutrientIds = await this.prepareNutrients(records);
    for (const [index, record] of records.entries()) {
      if (index === 0) {
        console.log(`[USDA import] importing first record (${record.sourceId})...`);
      }
      try {
        await this.importOne(record, categoryIds, nutrientIds);
        imported += 1;
        if (index === 0) {
          console.log(`[USDA import] first record completed (${record.sourceId}).`);
        }
        if (imported % 100 === 0) {
          console.log(`[USDA import] imported ${imported} foods.`);
        }
      } catch (error) {
        failures.push({
          sourceId: record.sourceId,
          message: error instanceof Error ? error.message : String(error),
        });
        if (index === 0) {
          console.error(
            `[USDA import] first record failed (${record.sourceId}).`,
            error instanceof Error ? error.stack ?? error.message : error,
          );
        }
      }
    }
    return { imported, failed: failures.length, failures };
  }

  private async prepareCategories(records: readonly ImportedFoodRecord[]): Promise<Map<string, string>> {
    const categories = new Map<string, ImportedFoodRecord['category']>();
    for (const record of records) categories.set(record.category.sourceId, record.category);
    const source = 'usda-fdc';
    const sourceIds = [...categories.keys()];
    const existing = await this.prisma.foodCategory.findMany({
      where: { source, sourceId: { in: sourceIds } },
      select: { id: true, sourceId: true },
    });
    const existingIds = new Set(existing.map((category) => category.sourceId));
    const missing = [...categories.values()]
      .filter((category) => !existingIds.has(category.sourceId))
      .map((category) => ({ source, sourceId: category.sourceId, name: category.name }));
    if (missing.length > 0) {
      await this.prisma.foodCategory.createMany({ data: missing, skipDuplicates: true });
    }
    const all = await this.prisma.foodCategory.findMany({
      where: { source, sourceId: { in: sourceIds } },
      select: { id: true, sourceId: true },
    });
    return new Map(all.flatMap((category) => category.sourceId ? [[category.sourceId, category.id] as const] : []));
  }

  private async prepareNutrients(records: readonly ImportedFoodRecord[]): Promise<Map<string, string>> {
    const nutrients = new Map<string, ImportedFoodRecord['nutrients'][number]>();
    for (const record of records) {
      for (const nutrient of record.nutrients) nutrients.set(nutrient.sourceId, nutrient);
    }
    const source = 'usda-fdc';
    const sourceIds = [...nutrients.keys()];
    const existing = await this.prisma.nutrient.findMany({
      where: { source, sourceId: { in: sourceIds } },
      select: { id: true, sourceId: true },
    });
    const existingIds = new Set(existing.map((nutrient) => nutrient.sourceId));
    const missing = [...nutrients.values()]
      .filter((nutrient) => !existingIds.has(nutrient.sourceId))
      .map((nutrient) => ({ source, sourceId: nutrient.sourceId, name: nutrient.name, unit: nutrient.unit }));
    if (missing.length > 0) {
      await this.prisma.nutrient.createMany({ data: missing, skipDuplicates: true });
    }
    const all = await this.prisma.nutrient.findMany({
      where: { source, sourceId: { in: sourceIds } },
      select: { id: true, sourceId: true },
    });
    return new Map(all.flatMap((nutrient) => nutrient.sourceId ? [[nutrient.sourceId, nutrient.id] as const] : []));
  }

  private async importOne(
    record: ImportedFoodRecord,
    categoryIds: ReadonlyMap<string, string>,
    nutrientIds: ReadonlyMap<string, string>,
  ): Promise<void> {
    const categoryId = categoryIds.get(record.category.sourceId);
    if (!categoryId) throw new Error(`Category ${record.category.sourceId} was not prepared.`);
    await this.prisma.$transaction(async (tx) => {
      const food = await tx.food.upsert({
        where: { source_sourceId: { source: record.source, sourceId: record.sourceId } },
        update: { name: record.name, categoryId },
        create: { source: record.source, sourceId: record.sourceId, name: record.name, categoryId },
      });
      await tx.foodNutrient.deleteMany({ where: { foodId: food.id } });
      await tx.serving.deleteMany({ where: { foodId: food.id } });
      await tx.foodNutrient.createMany({
        data: record.nutrients.map((nutrient) => {
          const nutrientId = nutrientIds.get(nutrient.sourceId);
          if (!nutrientId) throw new Error(`Nutrient ${nutrient.sourceId} was not prepared.`);
          return { foodId: food.id, nutrientId, amount: nutrient.amountPer100Grams };
        }),
      });
      await tx.serving.createMany({
        data: record.servings.map((serving) => ({ foodId: food.id, name: serving.name, grams: serving.grams })),
      });
    });
  }
}
