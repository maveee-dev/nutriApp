import { describe, expect, it } from 'vitest';
import { recipeMatchesQuery } from './recipeSearch';

const recipe = (name: string) => ({ versions: [{ name }] }) as never;

describe('recipeMatchesQuery', () => {
  it('matches all words regardless of their order or plurality', () => {
    expect(recipeMatchesQuery(recipe('Green Bean Salad'), 'green beans')).toBe(true);
    expect(recipeMatchesQuery(recipe('Chicken Adobo'), 'chicken adobo')).toBe(true);
  });

  it('does not match an unrelated saved recipe', () => {
    expect(recipeMatchesQuery(recipe('Chicken Adobo'), 'green beans')).toBe(false);
  });
});
