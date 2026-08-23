import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  analyzeFoodPresentationGrammar,
  formatFoodPresentationGrammarAnalysis,
  type FoodGrammarAnalysisRecord,
} from '../src/nutrition/foods/services/food-presentation-grammar-analysis.js';

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
    },
  });

  const report = analyzeFoodPresentationGrammar(
    foods as readonly FoodGrammarAnalysisRecord[],
  );
  const auditDirectory = path.resolve(process.cwd(), 'audit');
  const textPath = path.join(auditDirectory, 'food-presentation-grammar-analysis.txt');
  const jsonPath = path.join(auditDirectory, 'food-presentation-grammar-analysis.json');

  await mkdir(auditDirectory, { recursive: true });
  await Promise.all([
    writeFile(textPath, formatFoodPresentationGrammarAnalysis(report), 'utf8'),
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
  ]);

  console.log(
    [
      'Food Presentation Grammar Analysis complete.',
      'TXT: audit/food-presentation-grammar-analysis.txt',
      'JSON: audit/food-presentation-grammar-analysis.json',
    ].join('\n'),
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
