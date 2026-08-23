import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  auditFoodPresentationRecords,
  type FoodPresentationAuditRecord,
} from '../src/nutrition/foods/services/food-presentation-quality-audit.js';
import { formatFoodPresentationQualityReport } from '../src/nutrition/foods/services/food-presentation-quality-report.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main(): Promise<void> {
  const foods = await prisma.food.findMany({
    orderBy: [{ source: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      source: true,
      sourceId: true,
      presentation: {
        select: {
          displayNameOverride: true,
          variantLabelOverride: true,
          searchPriority: true,
          aliases: {
            select: {
              alias: true,
              normalizedAlias: true,
              priority: true,
            },
          },
        },
      },
    },
  });

  const report = auditFoodPresentationRecords(
    foods as readonly FoodPresentationAuditRecord[],
  );
  const auditDirectory = path.resolve(process.cwd(), 'audit');
  const textPath = path.join(auditDirectory, 'food-presentation-quality.txt');
  const jsonPath = path.join(auditDirectory, 'food-presentation-quality.json');

  await mkdir(auditDirectory, { recursive: true });
  await Promise.all([
    writeFile(textPath, formatFoodPresentationQualityReport(report), 'utf8'),
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
  ]);

  console.log(
    [
      'Food Presentation Audit complete.',
      'TXT: audit/food-presentation-quality.txt',
      'JSON: audit/food-presentation-quality.json',
    ].join('\n'),
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
