import { describe, expect, it } from 'vitest';
import { formatServingLabel } from './serving';

describe('formatServingLabel', () => {
  it('uses a household measure already supplied by the canonical serving', () => {
    expect(formatServingLabel({ name: '1 tbsp', grams: '15' })).toBe('1 tablespoon (15 g)');
    expect(formatServingLabel({ name: '0.25 cup', grams: '58' })).toBe('1/4 cup (58 g)');
  });

  it('falls back to canonical grams when the serving name has no reliable household unit', () => {
    expect(formatServingLabel({ name: '1 Soy Sauce', grams: '15' })).toBe('15 g serving');
    expect(formatServingLabel({ name: '0.25 Soy Sauce', grams: '58' })).toBe('58 g serving');
  });

  it('does not alter the canonical gram quantity used for calculation', () => {
    const serving = { name: '1 tablespoon', grams: '15' };
    expect(formatServingLabel(serving)).toContain(`(${serving.grams} g)`);
    expect(serving.grams).toBe('15');
  });
});
