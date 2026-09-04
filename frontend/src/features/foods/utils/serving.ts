import type { Serving } from '../types/foods.types';

function isGramBased(serving: Serving): boolean {
  return /\b(?:gram|grams|g)\b|per\s*100/i.test(serving.name);
}

type ServingLabelInput = Pick<Serving, 'name' | 'grams'>;

const HOUSEHOLD_UNIT_NAMES: Readonly<Record<string, string>> = {
  tbsp: 'tablespoon',
  tablespoons: 'tablespoon',
  tablespoon: 'tablespoon',
  tsp: 'teaspoon',
  teaspoons: 'teaspoon',
  teaspoon: 'teaspoon',
  oz: 'ounce',
  ounces: 'ounce',
  ounce: 'ounce',
  clove: 'clove',
  cloves: 'clove',
  stick: 'stick',
  sticks: 'stick',
};

/**
 * Formats only a household measure already present in the canonical serving
 * name. Unrecognized names intentionally fall back to grams instead of
 * guessing a conversion from food identity or weight.
 */
export function formatServingLabel(serving: ServingLabelInput): string {
  const name = serving.name.trim().replace(/\s+/g, ' ');
  const householdMatch = name.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s+([a-zA-Z]+)(?:\s+.*)?$/);
  if (householdMatch) {
    const [, amount, rawUnit] = householdMatch;
    const normalizedUnit = rawUnit?.toLowerCase();
    const unit = normalizedUnit == null ? undefined : HOUSEHOLD_UNIT_NAMES[normalizedUnit] ?? normalizedUnit;
    if (unit && ['cup', 'cups', 'tablespoon', 'teaspoon', 'ounce', 'slice', 'piece', 'egg', 'serving', 'fillet', 'breast', 'leg', 'bowl', 'glass', 'can', 'packet', 'clove', 'stick'].includes(unit)) {
      const displayUnit = unit === 'cups' ? 'cup' : unit.endsWith('s') ? unit.slice(0, -1) : unit;
      const numericAmount = amount?.includes('/') ? amount : Number(amount);
      const normalizedAmount = typeof numericAmount === 'number' && numericAmount === 0.25 ? '1/4' : String(numericAmount);
      const plural = normalizedAmount !== '1' && !normalizedAmount.includes('/') ? 's' : '';
      return `${normalizedAmount} ${displayUnit}${plural} (${serving.grams} g)`;
    }
  }

  return `${serving.grams} g serving`;
}

function householdServingScore(serving: Serving): number {
  if (isGramBased(serving)) return -1;

  const name = serving.name.trim().replace(/\s+/g, ' ');
  let score = 0;
  if (/\b(?:1|one)\b/i.test(name)) score += 3;
  if (/\b(?:small|medium|large|extra large)\b/i.test(name)) score += 4;
  if (/\b(?:cup|cups|tbsp|tsp|tablespoon|teaspoon|slice|piece|fillet|breast|leg|bowl|glass|can|packet|ounce|oz)\b/i.test(name)) score += 4;
  if (/\b(?:egg|banana|apple|orange|fruit|whole)\b/i.test(name)) score += 3;
  if (/\bserving\b/i.test(name)) score += 1;
  return score;
}

/** Selects the most human-readable canonical serving returned by the API. */
export function preferredServing(servings: readonly Serving[]): Serving | null {
  if (servings.length === 0) return null;

  const scored = servings
    .map((serving, index) => ({ serving, index, score: householdServingScore(serving) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  if (scored.length > 0) {
    return scored[0].serving;
  }

  return servings.find((serving) => !isGramBased(serving)) ?? servings[0];
}

export function formatDisplayNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const digits = Math.abs(value) >= 100 ? 0 : 1;
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function scaleNutrientAmount(amount: string, grams: number): string {
  const numericAmount = Number.parseFloat(amount);
  const servingGrams = Number.isFinite(grams) && grams > 0 ? grams : 100;
  if (!Number.isFinite(numericAmount)) return amount;
  return formatDisplayNumber((numericAmount * servingGrams) / 100);
}

export function servingGrams(serving: Serving | null | undefined, quantity = 1): number {
  const grams = Number.parseFloat(serving?.grams ?? '100');
  const portions = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  return (Number.isFinite(grams) && grams > 0 ? grams : 100) * portions;
}
