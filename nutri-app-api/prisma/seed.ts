import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from '@prisma/adapter-pg'
import { readFile } from 'node:fs/promises';
import { UsdaFoodDataMapper } from './import/usda-fooddata.mapper.js';
import { UsdaFoodDataImporter } from './import/usda-fooddata.importer.js';
import type { UsdaFoodDataRecord } from './import/usda-fooddata.types.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  const conditions = [
    {
      name: 'CKD',
      description: 'Chronic Kidney Disease',
    },
    {
      name: 'Dialysis',
      description: 'Receiving dialysis treatment'
    },
    {
      name: 'Diabetes',
      description: 'Diabetes Mellitus',
    },
    {     
      name: 'Hypertension',
      description: 'High Blood Pressure',
    },
    {
      name: 'Heart Disease',
      description: 'Cardiovascular disease',
    },
    {
      name: 'High Cholesterol',
      description: 'Hyperlipidemia',
    },
    {
      name: 'Gout',
      description: 'Hyperuricemia / Gout',
    },
    {
      name: 'Anemia',
      description: 'Low hemoglobin',
    },
  ];

  for (const condition of conditions) {
    await prisma.condition.upsert({
      where: {
        name: condition.name
      },
      update: {},
      create: condition,
    });
  }

  const datasetPath = process.env.USDA_FDC_JSON_PATH;
  if (datasetPath) {
    const raw = JSON.parse(await readFile(datasetPath, 'utf8')) as unknown;
    const records = Array.isArray(raw)
  ? raw
  : (
      raw as {
        FoundationFoods?: unknown[];
        SRLegacyFoods?: unknown[];
      }
    ).FoundationFoods ??
    (
      raw as {
        FoundationFoods?: unknown[];
        SRLegacyFoods?: unknown[];
      }
    ).SRLegacyFoods;
    if (!Array.isArray(records)) {
      throw new Error('USDA_FDC_JSON_PATH must contain a JSON array or a FoundationFoods array.');
    }
    const mapper = new UsdaFoodDataMapper();
    const mapped = mapper.mapMany(records as (UsdaFoodDataRecord | null)[]);

    console.log("Raw USDA records:", records.length);
    console.log("Mapped records:", mapped.records.length);
    console.log("Skipped issues:", mapped.issues.length);
    console.log("First issues:", mapped.issues.slice(0, 10));

    for (const issue of mapped.issues) console.warn(`[USDA import skipped ${issue.sourceId}] ${issue.message}`);
    const summary = await new UsdaFoodDataImporter(prisma).import(mapped.records);
    console.log(`USDA import complete: ${summary.imported} imported, ${summary.failed} failed.`);
    for (const failure of summary.failures) console.warn(`[USDA import failed ${failure.sourceId}] ${failure.message}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

