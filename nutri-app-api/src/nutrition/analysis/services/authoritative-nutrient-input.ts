/**
 * Selects authoritative nutrient rows before they enter the calculation
 * kernel. This is an application input adapter, not part of the kernel: the
 * kernel deliberately treats nutrient identities as opaque.
 *
 * USDA publishes a few mutually exclusive representations under different
 * nutrient IDs. They must not be added together. The selected row keeps its
 * original name, unit, and value so existing raw Nutrition Facts contracts
 * remain unchanged.
 */

export interface AuthoritativeNutrientInput {
  readonly sourceId?: string | null;
  readonly name: string;
  readonly unit: string;
  readonly amountPer100Grams: string | null | undefined;
}

type SelectionGroup = 'carbohydrates' | 'fiber' | 'energy';

const GROUP_SOURCE_IDS: Readonly<Record<SelectionGroup, Readonly<Record<string, number>>>> = {
  carbohydrates: { '1005': 100, '1050': 80 },
  fiber: { '1079': 100, '1082': 80, '1084': 80 },
  energy: { '1008': 100, '1062': 80 },
};

/**
 * Returns rows in their original order, removing only mutually exclusive
 * alternatives. Fiber component rows remain additive when no total dietary
 * fiber row exists; a total row always wins over its components.
 */
export function selectAuthoritativeNutrientInputs<T extends AuthoritativeNutrientInput>(
  nutrients: readonly T[],
): T[] {
  const grouped = new Map<SelectionGroup, Array<{ nutrient: T; index: number }>>();
  nutrients.forEach((nutrient, index) => {
    const group = selectionGroup(nutrient);
    if (group == null) return;
    const entries = grouped.get(group) ?? [];
    entries.push({ nutrient, index });
    grouped.set(group, entries);
  });

  const excluded = new Set<number>();
  for (const [group, entries] of grouped) {
    if (group === 'fiber') {
      const total = entries.filter(({ nutrient }) => isFiberTotal(nutrient));
      if (total.length > 0) {
        const winner = chooseBest(group, total);
        entries.forEach(({ index }) => {
          if (index !== winner.index) excluded.add(index);
        });
        continue;
      }

      // Soluble and insoluble fiber are disjoint components. Keep one of each
      // and remove duplicate representations of the same component.
      const componentWinners = new Map<string, { nutrient: T; index: number }>();
      for (const entry of entries) {
        const component = fiberComponent(entry.nutrient);
        if (component == null) {
          const winner = componentWinners.get('generic');
          if (winner == null || score(group, entry.nutrient) > score(group, winner.nutrient)) componentWinners.set('generic', entry);
          continue;
        }
        const winner = componentWinners.get(component);
        if (winner == null || score(group, entry.nutrient) > score(group, winner.nutrient)) componentWinners.set(component, entry);
      }
      const winners = new Set([...componentWinners.values()].map(({ index }) => index));
      entries.forEach(({ index }) => {
        if (!winners.has(index)) excluded.add(index);
      });
      continue;
    }

    const winner = chooseBest(group, entries);
    entries.forEach(({ index }) => {
      if (index !== winner.index) excluded.add(index);
    });
  }

  return nutrients.filter((_, index) => !excluded.has(index));
}

/**
 * Returns a stable aggregation key for the mutually exclusive USDA groups.
 * Other nutrient names deliberately retain their existing normalized-name
 * behavior so unrelated legacy totals are not collapsed.
 */
export function authoritativeNutrientKey(nutrient: AuthoritativeNutrientInput): string {
  return selectionGroup(nutrient) ?? normalize(nutrient.name);
}

function selectionGroup(nutrient: AuthoritativeNutrientInput): SelectionGroup | null {
  const normalized = normalize(nutrient.name);
  if (Object.prototype.hasOwnProperty.call(GROUP_SOURCE_IDS.carbohydrates, nutrient.sourceId ?? '')
    || normalized === 'carbohydrates'
    || normalized.startsWith('carbohydrate,')) return 'carbohydrates';
  if (Object.prototype.hasOwnProperty.call(GROUP_SOURCE_IDS.fiber, nutrient.sourceId ?? '')
    || normalized === 'fiber'
    || normalized.startsWith('fiber,')) return 'fiber';
  if (Object.prototype.hasOwnProperty.call(GROUP_SOURCE_IDS.energy, nutrient.sourceId ?? '')
    || normalized === 'energy'
    || normalized.startsWith('energy,')) return 'energy';
  return null;
}

function chooseBest<T extends AuthoritativeNutrientInput>(
  group: SelectionGroup,
  entries: readonly { nutrient: T; index: number }[],
): { nutrient: T; index: number } {
  return [...entries].sort((left, right) =>
    score(group, right.nutrient) - score(group, left.nutrient)
      || left.index - right.index,
  )[0]!;
}

function score(group: SelectionGroup, nutrient: AuthoritativeNutrientInput): number {
  const sourceScore = GROUP_SOURCE_IDS[group][nutrient.sourceId ?? ''];
  if (sourceScore != null) return sourceScore;
  const normalized = normalize(nutrient.name);
  if (group === 'carbohydrates') {
    if (normalized.includes('by difference')) return 95;
    if (normalized.includes('by summation')) return 75;
    return 90;
  }
  if (group === 'fiber') {
    if (normalized.includes('total dietary')) return 95;
    if (normalized.includes('soluble') || normalized.includes('insoluble')) return 70;
    return 90;
  }
  if (nutrient.unit.trim().toLowerCase() === 'kcal' || normalized.includes('kcal')) return 95;
  if (nutrient.unit.trim().toLowerCase() === 'kj' || normalized.includes('kj')) return 75;
  return 90;
}

function isFiberTotal(nutrient: AuthoritativeNutrientInput): boolean {
  const normalized = normalize(nutrient.name);
  return nutrient.sourceId === '1079'
    || normalized === 'fiber'
    || normalized.includes('total dietary');
}

function fiberComponent(nutrient: AuthoritativeNutrientInput): string | null {
  const normalized = normalize(nutrient.name);
  if (nutrient.sourceId === '1084' || normalized.includes('insoluble')) return 'insoluble';
  if (nutrient.sourceId === '1082' || normalized.includes('soluble')) return 'soluble';
  return null;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
