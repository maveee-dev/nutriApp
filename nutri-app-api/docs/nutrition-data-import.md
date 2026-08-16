# Nutrition data import

The seed process can import USDA FoodData Central JSON records without fabricating or filling missing values.

## USDA input

Set `USDA_FDC_JSON_PATH` to a downloaded USDA FoodData Central Foundation Foods JSON file (or a JSON array of records), then run the Prisma seed command. The importer accepts Foundation and SR Legacy records only. Branded and other record types are rejected because their nutrient basis may not match the canonical model.

```powershell
$env:USDA_FDC_JSON_PATH = 'C:\data\FoodData_Central_foundation_food_json.json'
npx prisma db seed
```

USDA nutrient values are imported as the canonical amount per 100 grams. The importer requires valid nutrient identifiers, supported units, non-negative values, and at least one positive gram-based serving. It skips invalid records and reports the reason; it never invents a missing category, nutrient, amount, or serving.

Foods, categories, and nutrients carry a source and external source identifier. This makes repeated USDA imports idempotent and leaves room for future datasets, including Philippine-specific sources, without treating same-named records as the same canonical record.

The importer replaces the imported food's nutrient and serving rows inside a transaction so re-importing the same USDA record reflects the source dataset while preserving unrelated records.
