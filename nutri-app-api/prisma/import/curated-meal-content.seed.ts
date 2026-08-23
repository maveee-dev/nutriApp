import { createHash } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client.js';

type Db = PrismaClient;
type CanonicalFood = {
  readonly id: string;
  readonly name: string;
  readonly servings: readonly { readonly id: string; readonly name: string; readonly grams: unknown }[];
};

type ComponentDefinition = {
  readonly role: 'MAIN_DISH' | 'STAPLE' | 'SIDE_DISH' | 'SOUP' | 'FRUIT' | 'DRINK' | 'INGREDIENT';
  readonly foodNames: readonly string[];
  readonly quantity: string;
  readonly unit: 'GRAM' | 'SERVING';
};

type RecipeDefinition = {
  readonly name: string;
  readonly cuisine: string;
  readonly mealTypes: readonly ('BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK')[];
  readonly components: readonly ComponentDefinition[];
};

const recipes: readonly RecipeDefinition[] = [
  {
    name: 'Chicken Adobo', cuisine: 'Filipino', mealTypes: ['LUNCH', 'DINNER'],
    components: [
      { role: 'MAIN_DISH', foodNames: ['Chicken, broilers or fryers, breast, meat only, cooked, roasted', 'Chicken, broilers or fryers, meat and skin, cooked, roasted'], quantity: '150', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Onions, raw', 'Onion, raw'], quantity: '25', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Garlic, raw'], quantity: '5', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Vinegar, distilled'], quantity: '15', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Soy sauce made from soy (tamari)', 'Soy sauce'], quantity: '10', unit: 'GRAM' },
    ],
  },
  {
    name: 'Tinola', cuisine: 'Filipino', mealTypes: ['LUNCH', 'DINNER'],
    components: [
      { role: 'MAIN_DISH', foodNames: ['Chicken, broilers or fryers, breast, meat only, cooked, roasted', 'Chicken, broilers or fryers, meat and skin, cooked, roasted'], quantity: '140', unit: 'GRAM' },
      { role: 'SOUP', foodNames: ['Cabbage, raw'], quantity: '100', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Onions, raw', 'Onion, raw'], quantity: '25', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Garlic, raw'], quantity: '5', unit: 'GRAM' },
    ],
  },
  {
    name: 'Sinigang', cuisine: 'Filipino', mealTypes: ['LUNCH', 'DINNER'],
    components: [
      { role: 'MAIN_DISH', foodNames: ['Fish, tilapia, cooked, dry heat', 'Fish, salmon, Atlantic, farmed, cooked, dry heat'], quantity: '150', unit: 'GRAM' },
      { role: 'SOUP', foodNames: ['Cabbage, raw'], quantity: '100', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Tomatoes, red, ripe, raw, year round average', 'Tomato, red, ripe, raw'], quantity: '50', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Onions, raw', 'Onion, raw'], quantity: '25', unit: 'GRAM' },
    ],
  },
  {
    name: 'Ginisang Gulay', cuisine: 'Filipino', mealTypes: ['LUNCH', 'DINNER'],
    components: [
      { role: 'MAIN_DISH', foodNames: ['Eggplant, raw'], quantity: '120', unit: 'GRAM' },
      { role: 'SIDE_DISH', foodNames: ['Beans, snap, green, raw', 'Green beans, raw'], quantity: '100', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Tomatoes, red, ripe, raw, year round average', 'Tomato, red, ripe, raw'], quantity: '50', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Onions, raw', 'Onion, raw'], quantity: '25', unit: 'GRAM' },
    ],
  },
  {
    name: 'Pinakbet', cuisine: 'Filipino', mealTypes: ['LUNCH', 'DINNER'],
    components: [
      { role: 'MAIN_DISH', foodNames: ['Eggplant, raw'], quantity: '100', unit: 'GRAM' },
      { role: 'SIDE_DISH', foodNames: ['Beans, snap, green, raw', 'Green beans, raw'], quantity: '100', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Tomatoes, red, ripe, raw, year round average', 'Tomato, red, ripe, raw'], quantity: '50', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Onions, raw', 'Onion, raw'], quantity: '25', unit: 'GRAM' },
    ],
  },
  {
    name: 'Tortang Talong', cuisine: 'Filipino', mealTypes: ['BREAKFAST', 'LUNCH', 'DINNER'],
    components: [
      { role: 'MAIN_DISH', foodNames: ['Eggplant, raw'], quantity: '180', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Egg, whole, raw, fresh', 'Eggs, Grade A, Large, egg whole'], quantity: '50', unit: 'GRAM' },
      { role: 'INGREDIENT', foodNames: ['Onions, raw', 'Onion, raw'], quantity: '20', unit: 'GRAM' },
    ],
  },
  {
    name: 'Grilled Fish', cuisine: 'Filipino', mealTypes: ['LUNCH', 'DINNER'],
    components: [
      { role: 'MAIN_DISH', foodNames: ['Fish, tilapia, cooked, dry heat', 'Fish, salmon, Atlantic, farmed, cooked, dry heat'], quantity: '170', unit: 'GRAM' },
      { role: 'SIDE_DISH', foodNames: ['Tomatoes, red, ripe, raw, year round average', 'Tomato, red, ripe, raw'], quantity: '60', unit: 'GRAM' },
    ],
  },
  {
    name: 'Chicken with Vegetables', cuisine: 'Filipino', mealTypes: ['LUNCH', 'DINNER'],
    components: [
      { role: 'MAIN_DISH', foodNames: ['Chicken, broilers or fryers, breast, meat only, cooked, roasted', 'Chicken, broilers or fryers, meat and skin, cooked, roasted'], quantity: '140', unit: 'GRAM' },
      { role: 'SIDE_DISH', foodNames: ['Carrots, raw'], quantity: '70', unit: 'GRAM' },
      { role: 'SIDE_DISH', foodNames: ['Cabbage, raw'], quantity: '90', unit: 'GRAM' },
    ],
  },
  {
    name: 'Oatmeal with Fruit', cuisine: 'Filipino', mealTypes: ['BREAKFAST'],
    components: [
      { role: 'MAIN_DISH', foodNames: ['Oats, regular and quick, not fortified, dry', 'Oats, regular and quick, not fortified', 'Oatmeal, regular and quick, not fortified, dry', 'Rolled oats, dry'], quantity: '45', unit: 'GRAM' },
      { role: 'FRUIT', foodNames: ['Bananas, raw', 'Banana, raw'], quantity: '80', unit: 'GRAM' },
      { role: 'FRUIT', foodNames: ['Apples, raw, with skin', 'Apple, raw, with skin'], quantity: '80', unit: 'GRAM' },
    ],
  },
  {
    name: 'Yogurt with Fruit', cuisine: 'Filipino', mealTypes: ['BREAKFAST', 'SNACK'],
    components: [
      { role: 'MAIN_DISH', foodNames: ['Yogurt, plain, low fat'], quantity: '170', unit: 'GRAM' },
      { role: 'FRUIT', foodNames: ['Bananas, raw', 'Banana, raw'], quantity: '80', unit: 'GRAM' },
      { role: 'FRUIT', foodNames: ['Apples, raw, with skin', 'Apple, raw, with skin'], quantity: '80', unit: 'GRAM' },
    ],
  },
];

const stableId = (kind: string, value: string): string => {
  const hex = createHash('sha256').update(`${kind}:${value}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const normalizeFoodName = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

type ResolutionReport = {
  readonly resolved: Map<string, string>;
  readonly missing: Map<string, { aliases: readonly string[]; recipes: Set<string> }>;
  readonly skippedRecipes: Map<string, readonly string[]>;
};

function resolveCanonicalFood(
  catalog: readonly CanonicalFood[],
  aliases: readonly string[],
  recipeName: string,
  report: ResolutionReport,
): CanonicalFood | null {
  const normalizedAliases = aliases.map(normalizeFoodName);
  const ranked = catalog.flatMap((food) => {
    const normalizedFood = normalizeFoodName(food.name);
    const scores = normalizedAliases.flatMap((alias, aliasIndex) => {
      if (normalizedFood === alias) return [{ score: 0, aliasIndex }];
      if (normalizedFood.includes(alias)) return [{ score: 100 + normalizedFood.length - alias.length, aliasIndex }];
      if (alias.includes(normalizedFood)) return [{ score: 200 + alias.length - normalizedFood.length, aliasIndex }];
      return [];
    });
    const best = scores.sort((left, right) => left.score - right.score || left.aliasIndex - right.aliasIndex)[0];
    return best == null ? [] : [{ food, score: best.score }];
  }).sort((left, right) => left.score - right.score || left.food.name.localeCompare(right.food.name) || left.food.id.localeCompare(right.food.id));
  const match = ranked[0]?.food ?? null;
  const key = aliases.join(' | ');
  if (match != null) {
    report.resolved.set(`${key} [${recipeName}]`, match.name);
    return match;
  }
  const missing = report.missing.get(key) ?? { aliases, recipes: new Set<string>() };
  missing.recipes.add(recipeName);
  report.missing.set(key, missing);
  return null;
}

function printResolutionReport(report: ResolutionReport): void {
  console.log(JSON.stringify({
    successfullyResolvedCanonicalFoods: [...report.resolved.entries()].map(([requested, selected]) => ({ requested, selected })),
    missingCanonicalFoods: [...report.missing.values()].map(({ aliases, recipes: affected }) => ({ aliases, recipes: [...affected] })),
    recipesSkippedBecauseFoodsWereUnavailable: [...report.skippedRecipes.entries()].map(([name, missing]) => ({ name, missing })),
  }, null, 2));
}

export async function seedCuratedMealContent(prisma: Db): Promise<{ recipes: number; templates: number }> {
  const report: ResolutionReport = { resolved: new Map(), missing: new Map(), skippedRecipes: new Map() };
  const catalog = await prisma.food.findMany({ include: { servings: { orderBy: { name: 'asc' } } } });
  const recipeVersionIds = new Map<string, string>();

  for (const definition of recipes) {
    const resolvedComponents = definition.components.map((component) => ({
      component,
      food: resolveCanonicalFood(catalog, component.foodNames, definition.name, report),
    }));
    const missingComponents = resolvedComponents.filter(({ food }) => food == null).map(({ component }) => component.foodNames.join(' | '));
    if (missingComponents.length > 0) {
      report.skippedRecipes.set(definition.name, missingComponents);
      continue;
    }
    const recipeId = stableId('curated-recipe', definition.name);
    const versionId = stableId('curated-recipe-version', definition.name);
    const existing = await prisma.recipeVersion.findUnique({ where: { id: versionId } });
    if (existing == null) {
      await prisma.$transaction(async (tx) => {
        await tx.recipe.upsert({ where: { id: recipeId }, update: {}, create: { id: recipeId, visibility: 'SHARED' } });
        await tx.recipeVersion.create({
          data: {
            id: versionId, recipeId, version: 1, name: definition.name,
            description: `Curated ${definition.cuisine} dish evaluated from canonical Food components.`,
            cuisine: definition.cuisine, mealTypes: [...definition.mealTypes], sourceType: 'OFFICIAL',
            sourceName: 'NutriApp curated recipe library', sourceReference: 'nutriapp-curated-recipes-v1', sourceVersion: 'v1',
            approvalStatus: 'APPROVED', approvedAt: new Date(),
          },
        });
        await tx.recipeComponent.createMany({
          data: resolvedComponents.map(({ component, food }, displayOrder) => {
            const canonical = food as CanonicalFood;
            const serving = canonical.servings[0] ?? null;
            return {
              id: stableId('curated-recipe-component', `${definition.name}:${displayOrder}`), recipeVersionId: versionId,
              foodId: canonical.id, servingId: component.unit === 'SERVING' ? serving?.id : null,
              role: component.role, quantity: component.quantity, unit: component.unit, displayOrder,
            };
          }),
        });
      });
    } else {
      const existingComponents = await prisma.recipeComponent.count({ where: { recipeVersionId: versionId } });
      if (existingComponents < definition.components.length) {
        await prisma.recipeComponent.createMany({
          data: resolvedComponents.map(({ component, food }, displayOrder) => {
            const canonical = food as CanonicalFood;
            const serving = canonical.servings[0] ?? null;
            return {
              id: stableId('curated-recipe-component', `${definition.name}:${displayOrder}`), recipeVersionId: versionId,
              foodId: canonical.id, servingId: component.unit === 'SERVING' ? serving?.id : null,
              role: component.role, quantity: component.quantity, unit: component.unit, displayOrder,
            };
          }), skipDuplicates: true,
        });
      }
    }
    recipeVersionIds.set(definition.name, versionId);
  }

  const rice = resolveCanonicalFood(catalog, ['Rice, white, long-grain, regular, cooked', 'Rice, white, long-grain, regular, enriched, cooked'], 'Meal templates', report);
  const apple = resolveCanonicalFood(catalog, ['Apples, raw, with skin', 'Apple, raw, with skin'], 'Meal templates', report);
  const templateDefinitions = [
    {
      name: 'Filipino Rice Meal', mealTypes: ['LUNCH', 'DINNER'] as const,
      slots: [
        { name: 'Main Dish', role: 'MAIN_DISH' as const, kind: 'PARAMETERIZED' as const, required: true, fallback: false },
        { name: 'Staple', role: 'STAPLE' as const, kind: 'FIXED' as const, required: true, fallback: true, food: rice },
        ...(apple == null ? [] : [{ name: 'Fruit', role: 'FRUIT' as const, kind: 'FIXED' as const, required: false, fallback: true, food: apple }]),
      ],
    },
    {
      name: 'Breakfast', mealTypes: ['BREAKFAST'] as const,
      slots: [
        { name: 'Complete Breakfast', role: 'MAIN_DISH' as const, kind: 'FIXED' as const, required: true, fallback: false, recipe: recipeVersionIds.get('Oatmeal with Fruit') },
        ...(apple == null ? [] : [{ name: 'Fruit', role: 'FRUIT' as const, kind: 'FIXED' as const, required: false, fallback: true, food: apple }]),
      ],
    },
    {
      name: 'Snack', mealTypes: ['SNACK'] as const,
      slots: [
        { name: 'Snack Dish', role: 'MAIN_DISH' as const, kind: 'FIXED' as const, required: true, fallback: false, recipe: recipeVersionIds.get('Yogurt with Fruit') },
      ],
    },
  ];
  const validTemplateDefinitions = templateDefinitions.filter((definition) => definition.slots.every((slot) => {
    if (!slot.required) return true;
    if ('recipe' in slot) return slot.recipe != null;
    if ('food' in slot) return slot.food != null;
    return true;
  }));
  let createdTemplates = 0;

  for (const definition of validTemplateDefinitions) {
    const templateId = stableId('curated-template', definition.name);
    const versionId = stableId('curated-template-version', definition.name);
    const existing = await prisma.mealTemplateVersion.findUnique({ where: { id: versionId } });
    if (existing != null) {
      createdTemplates += 1;
      continue;
    }
    await prisma.mealTemplate.upsert({ where: { id: templateId }, update: {}, create: { id: templateId, visibility: 'SHARED' } });
    await prisma.mealTemplateVersion.create({
      data: {
        id: versionId, mealTemplateId: templateId, version: 1, name: definition.name,
        description: 'Structural meal pattern with culturally flexible meal roles.', cuisine: 'Filipino', mealTypes: [...definition.mealTypes],
        sourceType: 'OFFICIAL', sourceName: 'NutriApp curated meal template library', sourceReference: 'nutriapp-curated-templates-v1', sourceVersion: 'v1',
        approvalStatus: 'APPROVED', approvedAt: new Date(),
      },
    });
    for (const [displayOrder, slot] of definition.slots.entries()) {
      await prisma.mealTemplateSlot.create({
        data: {
          id: stableId('curated-template-slot', `${definition.name}:${displayOrder}`), mealTemplateVersionId: versionId,
          role: slot.role, kind: slot.kind, name: slot.name, required: slot.required, allowCanonicalFoodFallback: slot.fallback,
          displayOrder, recipeVersionId: 'recipe' in slot ? slot.recipe ?? null : null,
          foodId: 'food' in slot ? slot.food?.id ?? null : null, servingId: 'food' in slot ? slot.food?.servings[0]?.id ?? null : null,
          quantity: 'food' in slot ? '1' : null, unit: 'food' in slot ? 'SERVING' : null,
        },
      });
    }
    createdTemplates += 1;
  }
  printResolutionReport(report);
  return { recipes: recipeVersionIds.size, templates: createdTemplates };
}
