import { NutritionTargets } from './nutrition-targets.type.js';

export interface NutritionTargetDescriptor<K extends keyof NutritionTargets = keyof NutritionTargets> {
  readonly key: K;
  readonly required: boolean;
}

export const NUTRITION_TARGET_DESCRIPTORS = [
  { key: 'sodiumMilligrams', required: true },
  { key: 'proteinGrams', required: true },
  { key: 'saturatedFatGrams', required: false },
  { key: 'addedSugarGrams', required: false },
  { key: 'cholesterolMilligrams', required: false },
  { key: 'fiberGrams', required: false },
  { key: 'carbohydrateGrams', required: false },
  { key: 'potassiumMilligrams', required: false },
  { key: 'phosphorusMilligrams', required: false },
  { key: 'caloriesKcal', required: false },
] as const satisfies readonly NutritionTargetDescriptor[];

export function isValidNutritionTargets(value: unknown): value is NutritionTargets {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return NUTRITION_TARGET_DESCRIPTORS.every((descriptor) => {
    const target = record[descriptor.key];
    if (descriptor.required && !(descriptor.key in record)) return false;
    return target === undefined || target === null || typeof target === 'string';
  }) && typeof record.sodiumMilligrams === 'string';
}
