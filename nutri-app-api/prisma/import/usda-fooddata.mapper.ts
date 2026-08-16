import { ImportedFoodRecord, ImportIssue, UsdaFoodDataRecord, UsdaFoodNutrientRecord } from './usda-fooddata.types.js';

const SUPPORTED_DATA_TYPES = new Set(['foundation', 'foundation_food', 'sr legacy', 'sr_legacy']);
const UNIT_NAMES: Record<string, string> = {
  G: 'g',
  MG: 'mg',
  UG: 'mcg',
  MCG: 'mcg',
  KCAL: 'kcal',
  KJ: 'kJ',
};

export class UsdaFoodDataMapper {
  map(record: UsdaFoodDataRecord): ImportedFoodRecord {
    const sourceId = String(record.fdcId ?? '').trim();
    if (!sourceId) throw new Error('USDA record is missing fdcId.');
    if (record.dataType && !SUPPORTED_DATA_TYPES.has(record.dataType.trim().toLowerCase())) {
      throw new Error(`USDA food ${sourceId} has unsupported dataType ${record.dataType}.`);
    }
    const name = this.requiredText(record.description, `USDA food ${sourceId} is missing description.`);
    const categoryName = this.categoryName(record.foodCategory, sourceId);
    const nutrients = (record.foodNutrients ?? []).flatMap((nutrient) => {
      const mapped = this.mapNutrient(nutrient, sourceId);
      return mapped ? [mapped] : [];
    });
    if (nutrients.length === 0) throw new Error(`USDA food ${sourceId} has no nutrients.`);
    const servings = this.mapServings(record, sourceId);
    if (servings.length === 0) servings.push({ name: '100 g', grams: '100' });
    return {
      source: 'usda-fdc',
      sourceId,
      name,
      category: { sourceId: categoryName.toLowerCase(), name: categoryName },
      nutrients,
      servings,
    };
  }

  mapMany(records: readonly (UsdaFoodDataRecord | null)[]): { records: ImportedFoodRecord[]; issues: ImportIssue[] } {
    const mapped: ImportedFoodRecord[] = [];
    const issues: ImportIssue[] = [];
    const seen = new Set<string>();
    for (const [index, record] of records.entries()) {
      if (record == null) {
        issues.push({
          sourceId: `index:${index}`,
          message: 'USDA record is null and was skipped.',
        });
        continue;
      }
      const sourceId = String(record.fdcId ?? '').trim();
      if (seen.has(sourceId)) {
        issues.push({ sourceId, message: 'Duplicate USDA fdcId in input.' });
        continue;
      }
      seen.add(sourceId);
      try {
        mapped.push(this.map(record));
      } catch (error) {
        issues.push({ sourceId, message: error instanceof Error ? error.message : String(error) });
      }
    }
    return { records: mapped, issues };
  }

  private mapNutrient(nutrient: UsdaFoodNutrientRecord, _foodId: string) {
    const sourceId = String(nutrient.nutrient?.id ?? nutrient.nutrientId ?? '').trim();
    const name = String(nutrient.nutrient?.name ?? nutrient.nutrientName ?? '').trim();
    const unitKey = String(nutrient.nutrient?.unitName ?? nutrient.unitName ?? '')
      .trim()
      .replace(/[µμΜ]/g, 'u')
      .toUpperCase();
    const unit = UNIT_NAMES[unitKey];
    if (!sourceId || !name || !unit) return null;
    const value = this.decimal(nutrient.amount ?? nutrient.value);
    if (value == null) return null;
    return { sourceId, name, unit, amountPer100Grams: value };
  }

  private mapServings(record: UsdaFoodDataRecord, foodId: string) {
    const servings = (record.foodPortions ?? [])
      .map((portion) => {
        const grams = this.positiveDecimal(portion.gramWeight);
        const name = String(portion.portionDescription ?? '').trim();
        return grams && name ? { name, grams } : null;
      })
      .filter((portion): portion is { name: string; grams: string } => portion !== null);
    const servingUnit = String(record.servingSizeUnit ?? '').trim().toLowerCase();
    const servingSize = this.positiveDecimal(record.servingSize);
    if (servingSize && servingUnit === 'g' && !servings.some((item) => item.name === 'serving')) {
      servings.push({ name: 'serving', grams: servingSize });
    }
    const unique = new Map<string, { name: string; grams: string }>();
    for (const serving of servings) {
      const previous = unique.get(serving.name.toLowerCase());
      if (previous && previous.grams !== serving.grams) {
        throw new Error(`USDA food ${foodId} has conflicting serving weights for ${serving.name}.`);
      }
      unique.set(serving.name.toLowerCase(), serving);
    }
    return [...unique.values()];
  }

  private requiredText(value: string | undefined, message: string): string {
    const text = String(value ?? '').trim();
    if (!text) throw new Error(message);
    return text;
  }

  private categoryName(value: UsdaFoodDataRecord['foodCategory'], foodId: string): string {
    if (typeof value === 'string') return this.requiredText(value, `USDA food ${foodId} is missing foodCategory.`);
    return this.requiredText(
      value?.description ?? value?.name ?? value?.code,
      `USDA food ${foodId} is missing foodCategory.`,
    );
  }

  private decimal(value: number | string | null | undefined): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    if (!text) return null;
    const numberValue = Number(text);
    if (!Number.isFinite(numberValue) || numberValue < 0) return null;
    return text;
  }

  private positiveDecimal(value: number | string | undefined): string | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? String(value).trim() : null;
  }
}
