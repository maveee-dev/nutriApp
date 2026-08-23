import { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { ImportedFoodRecord } from './usda-fooddata.types.js';
import { classifyFoodPlanningClass } from '../../src/nutrition/foods/types/food-planning-class.js';
import { Decimal } from 'decimal.js';

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
        update: { name: record.name, categoryId, planningClass: classifyFoodPlanningClass(record.name, record.category.name) },
        create: { source: record.source, sourceId: record.sourceId, name: record.name, categoryId, planningClass: classifyFoodPlanningClass(record.name, record.category.name) },
      });
      await tx.foodNutrient.deleteMany({ where: { foodId: food.id } });
      await this.reconcileServings(tx, food.id, record.servings);
      await tx.foodNutrient.createMany({
        data: record.nutrients.map((nutrient) => {
          const nutrientId = nutrientIds.get(nutrient.sourceId);
          if (!nutrientId) throw new Error(`Nutrient ${nutrient.sourceId} was not prepared.`);
          return { foodId: food.id, nutrientId, amount: nutrient.amountPer100Grams };
        }),
      });
    });
  }

  private async reconcileServings(
    tx: Prisma.TransactionClient,
    foodId: string,
    importedServings: ImportedFoodRecord['servings'],
  ): Promise<void> {
    const existingServings = await tx.serving.findMany({
      where: { foodId },
      select: {
        id: true,
        name: true,
        grams: true,
        _count: {
          select: {
            mealItems: true,
            recipeComponents: true,
            mealTemplateSlots: true,
          },
        },
      },
    });

    const existingByKey = new Map<string, (typeof existingServings)[number]>();
    const existingByName = new Map<string, (typeof existingServings)[number]>();
    for (const serving of existingServings) {
      existingByKey.set(this.servingKey(serving.name, serving.grams), serving);
      existingByName.set(this.normalizeServingName(serving.name), serving);
    }

    const importedKeys = new Set<string>();
    for (const imported of importedServings) {
      const key = this.servingKey(imported.name, imported.grams);
      importedKeys.add(key);
      if (existingByKey.has(key)) continue;

      const sameName = existingByName.get(this.normalizeServingName(imported.name));
      if (sameName) {
        throw new Error(
          `Serving ${foodId}/${imported.name} changed from ${String(sameName.grams)} g to ${imported.grams} g; serving versioning is required before importing this change.`,
        );
      }

      await tx.serving.create({
        data: { foodId, name: imported.name, grams: imported.grams },
      });
    }

    for (const existing of existingServings) {
      if (importedKeys.has(this.servingKey(existing.name, existing.grams))) continue;
      const referenced = existing._count.mealItems > 0
        || existing._count.recipeComponents > 0
        || existing._count.mealTemplateSlots > 0;
      if (referenced) {
        console.warn(`[USDA import] retaining referenced obsolete serving ${existing.id} (${existing.name}, ${String(existing.grams)} g).`);
        continue;
      }
      await tx.serving.delete({ where: { id: existing.id } });
    }
  }

  private servingKey(name: string, grams: unknown): string {
    return `${this.normalizeServingName(name)}\u0000${new Decimal(String(grams)).toString()}`;
  }

  private normalizeServingName(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }
}
