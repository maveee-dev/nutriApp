import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

type ScoreBearingNutrient = 'sodium' | 'potassium' | 'saturated-fat' | 'cholesterol' | 'added-sugar';

/** Nutrients currently used by the general compatibility constraints. */
const CORE_AUDIT_NUTRIENTS: readonly ScoreBearingNutrient[] = [
  'sodium',
  'cholesterol',
  'saturated-fat',
];

/** Not universal completeness requirements: they are policy/data dependent. */
const CONDITIONAL_AUDIT_NUTRIENTS: readonly ScoreBearingNutrient[] = [
  'potassium',
  'added-sugar',
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function canonicalNutrient(name: string): ScoreBearingNutrient | null {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized === 'sodium' || normalized.startsWith('sodium,')) return 'sodium';
  if (normalized === 'potassium' || normalized.startsWith('potassium,')) return 'potassium';
  if (normalized === 'cholesterol') return 'cholesterol';
  if (normalized === 'saturated fat' || normalized === 'saturated-fat' || normalized.startsWith('fatty acids, total saturated')) return 'saturated-fat';
  if (normalized === 'added sugar' || normalized === 'added-sugar' || normalized.startsWith('sugars, added')) return 'added-sugar';
  return null;
}

function expectedUnit(nutrient: ScoreBearingNutrient): string {
  return nutrient === 'sodium' || nutrient === 'potassium' || nutrient === 'cholesterol' ? 'mg' : 'g';
}

async function main(): Promise<void> {
  const foods = await prisma.food.findMany({
    orderBy: [{ source: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      source: true,
      sourceId: true,
      nutrients: { select: { amount: true, nutrient: { select: { name: true, unit: true } } } },
    },
  });

  const auditRows = foods.map((food) => {
    const present = new Set<ScoreBearingNutrient>();
    for (const item of food.nutrients) {
      const nutrient = canonicalNutrient(item.nutrient.name);
      if (nutrient != null && item.nutrient.unit.trim().toLowerCase() === expectedUnit(nutrient)) present.add(nutrient);
    }
    return {
      id: food.id,
      name: food.name,
      source: food.source,
      sourceId: food.sourceId,
      missingCore: CORE_AUDIT_NUTRIENTS.filter((nutrient) => !present.has(nutrient)),
      missingConditional: CONDITIONAL_AUDIT_NUTRIENTS.filter((nutrient) => !present.has(nutrient)),
      totalNutrientRows: food.nutrients.length,
    };
  });

  const missingCoreFoods = auditRows.filter(({ missingCore }) => missingCore.length > 0);
  const conditionalOnlyFoods = auditRows.filter(({ missingCore, missingConditional }) => missingCore.length === 0 && missingConditional.length > 0);

  const missingCoreByNutrient = Object.fromEntries(CORE_AUDIT_NUTRIENTS.map((nutrient) => [
    nutrient,
    missingCoreFoods.filter((food) => food.missingCore.includes(nutrient)).length,
  ]));
  const missingConditionalByNutrient = Object.fromEntries(CONDITIONAL_AUDIT_NUTRIENTS.map((nutrient) => [
    nutrient,
    auditRows.filter((food) => food.missingConditional.includes(nutrient)).length,
  ]));
  const missingAllCore = missingCoreFoods.filter(({ missingCore }) => missingCore.length === CORE_AUDIT_NUTRIENTS.length);
  const completeCore = auditRows.filter(({ missingCore }) => missingCore.length === 0);
  const percentage = (count: number): number => foods.length === 0 ? 0 : Math.round((count / foods.length) * 10000) / 100;
  const sortedReviewFoods = [...missingCoreFoods].sort((left, right) =>
    right.missingCore.length - left.missingCore.length
      || left.name.localeCompare(right.name)
      || left.id.localeCompare(right.id),
  );
  const reviewSeverity = Object.fromEntries(
    Array.from({ length: CORE_AUDIT_NUTRIENTS.length + 1 }, (_, missingCount) => {
      const count = auditRows.filter((food) => food.missingCore.length === missingCount).length;
      return [`missing${missingCount}CoreNutrients`, { count, percentage: percentage(count) }];
    }),
  );

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    coreAuditNutrients: CORE_AUDIT_NUTRIENTS,
    conditionalAuditNutrients: CONDITIONAL_AUDIT_NUTRIENTS,
    auditInterpretation: {
      addedSugar: 'optional-unless-an-approved-policy-requires-it; absence is not a data-quality failure by itself',
      potassium: 'conditional-until-an-approved-potassium-policy requires it; absence is reported separately',
      coreNutrients: 'missing rows are review candidates, not automatic import failures; zero-valued rows count as present',
    },
    totalFoods: foods.length,
    foodsWithCompleteCoreEvidence: completeCore.length,
    foodsWithCompleteCoreEvidencePercentage: percentage(completeCore.length),
    foodsMissingAnyCoreNutrient: missingCoreFoods.length,
    foodsMissingAnyCoreNutrientPercentage: percentage(missingCoreFoods.length),
    foodsMissingAllCoreNutrients: missingAllCore.length,
    foodsMissingAllCoreNutrientsPercentage: percentage(missingAllCore.length),
    missingCoreByNutrient,
    missingConditionalByNutrient,
    reviewSeverity,
    foodsMissingOnlyConditionalEvidence: conditionalOnlyFoods.length,
    foodsMissingOnlyConditionalEvidencePercentage: percentage(conditionalOnlyFoods.length),
    reviewFoodsMissingCoreEvidence: sortedReviewFoods,
  }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
