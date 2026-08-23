import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { toFoodSummarySource } from '../src/nutrition/foods/mappers/repository/food-repository.mapper.js';
import { FOOD_SUMMARY_INCLUDE } from '../src/nutrition/foods/repositories/food.prisma.js';
import {
  auditFoodSearchQuality,
  formatFoodSearchQualityReport,
} from '../src/nutrition/foods/services/food-search-quality-audit.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main(): Promise<void> {
  const rows = await prisma.food.findMany({
    orderBy: [{ source: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    include: FOOD_SUMMARY_INCLUDE,
  });
  const categories = await prisma.foodCategory.findMany({
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: { name: true },
  });
  const foods = rows.map(toFoodSummarySource);
  const report = auditFoodSearchQuality(
    foods,
    categories.map((category) => category.name),
  );
  const auditDirectory = path.resolve(process.cwd(), 'audit');
  const textPath = path.join(auditDirectory, 'food-search-quality.txt');
  const jsonPath = path.join(auditDirectory, 'food-search-quality.json');

  await mkdir(auditDirectory, { recursive: true });
  await Promise.all([
    writeFile(textPath, formatFoodSearchQualityReport(report), 'utf8'),
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
  ]);

  console.log(
    [
      'Food Search Quality Audit complete.',
      'TXT: audit/food-search-quality.txt',
      'JSON: audit/food-search-quality.json',
    ].join('\n'),
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
