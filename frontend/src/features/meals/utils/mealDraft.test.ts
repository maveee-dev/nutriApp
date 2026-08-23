import { describe, expect, it } from 'vitest';
import { mergeMealDraftItem, type MealDraftIdentityItem } from './mealDraft';

function item(
  id: string,
  foodId: string,
  servingId: string,
  quantity: string,
): MealDraftIdentityItem {
  return { id, foodId, selectedServingId: servingId, quantity };
}

describe('meal draft item identity', () => {
  it('merges an item with the same food and serving', () => {
    expect(
      mergeMealDraftItem(
        [item('existing', 'food-1', 'serving-1', '1')],
        item('incoming', 'food-1', 'serving-1', '0.5'),
      ),
    ).toEqual([item('existing', 'food-1', 'serving-1', '1.5')]);
  });

  it('keeps the same food as a separate item when the serving differs', () => {
    expect(
      mergeMealDraftItem(
        [item('existing', 'food-1', 'serving-1', '1')],
        item('incoming', 'food-1', 'serving-2', '1'),
      ),
    ).toEqual([
      item('existing', 'food-1', 'serving-1', '1'),
      item('incoming', 'food-1', 'serving-2', '1'),
    ]);
  });

  it('does not merge unresolved serving identities', () => {
    expect(
      mergeMealDraftItem(
        [item('existing', 'food-1', '', '1')],
        item('incoming', 'food-1', '', '1'),
      ),
    ).toHaveLength(2);
  });

  it('consolidates pre-existing duplicate identities deterministically', () => {
    expect(
      mergeMealDraftItem(
        [
          item('first', 'food-1', 'serving-1', '1'),
          item('second', 'food-1', 'serving-1', '2'),
        ],
        item('incoming', 'food-1', 'serving-1', '0.25'),
      ),
    ).toEqual([item('first', 'food-1', 'serving-1', '3.25')]);
  });
});
