import { describe, expect, it } from 'vitest';
import { formatDisplayNumber, preferredServing, scaleNutrientAmount, servingGrams } from './serving';

describe('preferredServing', () => {
  it('prefers a household serving over a gram basis', () => {
    expect(preferredServing([
      { id: 'grams', name: '100 g', grams: '100' },
      { id: 'medium', name: '1 medium banana', grams: '118' },
    ])).toMatchObject({ id: 'medium', grams: '118' });
  });

  it('recognizes USDA household variants without requiring the leading quantity', () => {
    expect(preferredServing([
      { id: 'generic', name: 'serving', grams: '100' },
      { id: 'egg', name: 'large egg', grams: '50' },
    ])).toMatchObject({ id: 'egg', grams: '50' });
  });

  it('keeps a user-selectable gram serving when no canonical household serving exists', () => {
    expect(preferredServing([{ id: 'grams', name: '100 g', grams: '100' }])).toMatchObject({ id: 'grams' });
  });

  it('returns null when a food has no serving records', () => {
    expect(preferredServing([])).toBeNull();
  });

  it('scales database nutrients to the selected household serving for display', () => {
    expect(scaleNutrientAmount('24.6', 118)).toBe('29.0');
    expect(formatDisplayNumber(534.9)).toBe('535');
    expect(formatDisplayNumber(7.02)).toBe('7.0');
  });

  it('includes the selected number of portions in the displayed gram equivalent', () => {
    expect(servingGrams({ id: 'medium', name: '1 medium banana', grams: '118' }, 2)).toBe(236);
  });
});
