export interface MealDraftIdentityItem {
  readonly id: string;
  readonly foodId: string;
  readonly selectedServingId: string;
  readonly quantity: string;
}

function quantityNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addQuantities(left: string, right: string): string {
  const total = quantityNumber(left) + quantityNumber(right);
  return Number.isInteger(total)
    ? String(total)
    : String(Math.round(total * 1_000_000) / 1_000_000);
}

function hasSameFoodAndServing(
  left: MealDraftIdentityItem,
  right: MealDraftIdentityItem,
): boolean {
  return (
    left.foodId === right.foodId &&
    left.selectedServingId !== '' &&
    left.selectedServingId === right.selectedServingId
  );
}

/**
 * Adds an item to a draft, consolidating all existing entries with the same
 * canonical food and serving identity. Empty serving IDs are intentionally
 * not merged because the serving has not been resolved yet.
 */
export function mergeMealDraftItem<T extends MealDraftIdentityItem>(
  items: readonly T[],
  incoming: T,
): T[] {
  const matches = items.filter(
    (item) => item.id !== incoming.id && hasSameFoodAndServing(item, incoming),
  );

  if (matches.length === 0) return [...items, incoming];

  const keeper = matches[0]!;
  const matchedIds = new Set(matches.map((item) => item.id));
  const mergedQuantity = [
    ...matches.map((item) => item.quantity),
    incoming.quantity,
  ].reduce((total, quantity) => addQuantities(total, quantity), '0');

  return items
    .filter(
      (item) =>
        item.id !== incoming.id &&
        (!matchedIds.has(item.id) || item.id === keeper.id),
    )
    .map((item) =>
      item.id === keeper.id ? { ...item, quantity: mergedQuantity } : item,
    );
}

