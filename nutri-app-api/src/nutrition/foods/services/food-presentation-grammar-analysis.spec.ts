import {
  analyzeFoodPresentationGrammar,
  formatFoodPresentationGrammarAnalysis,
} from './food-presentation-grammar-analysis.js';

describe('food presentation grammar analysis', () => {
  it('counts reusable vocabulary and combinations deterministically', () => {
    const report = analyzeFoodPresentationGrammar(
      [
        { id: '1', name: 'Beef, tenderloin, grilled, cooked' },
        { id: '2', name: 'Chicken, breast, roasted, cooked' },
        { id: '3', name: 'Fish, salmon, raw' },
        { id: '4', name: 'Nuts, almonds, roasted' },
        { id: '5', name: 'Cheese, cheddar, reduced fat' },
        { id: '6', name: 'Beverages, coffee, ready to drink' },
      ],
      '2026-01-01T00:00:00.000Z',
    );

    expect(report.totalFoods).toBe(6);
    expect(report.meatAndPoultry.animals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ term: 'beef', count: 1 }),
        expect.objectContaining({ term: 'chicken', count: 1 }),
      ]),
    );
    expect(report.meatAndPoultry.cuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ term: 'breast', count: 1 }),
        expect.objectContaining({ term: 'tenderloin', count: 1 }),
      ]),
    );
    expect(report.meatAndPoultry.animalCutCombinations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ terms: ['beef', 'tenderloin'], count: 1 }),
        expect.objectContaining({ terms: ['chicken', 'breast'], count: 1 }),
      ]),
    );
    expect(report.fishAndSeafood.species).toEqual(
      expect.arrayContaining([expect.objectContaining({ term: 'salmon', count: 1 })]),
    );
  });

  it('reports ambiguous descriptor terms and renders the requested sections', () => {
    const report = analyzeFoodPresentationGrammar([
      { id: '1', name: 'Butter, salted' },
      { id: '2', name: 'Coffee, ground' },
    ]);
    const text = formatFoodPresentationGrammarAnalysis(report);

    expect(report.ambiguousTerms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ term: 'butter', count: 1 }),
        expect.objectContaining({ term: 'ground', count: 1 }),
      ]),
    );
    expect(text).toContain('Meat & Poultry');
    expect(text).toContain('Highest-Impact Reusable Grammar Rules');
    expect(text).toContain('Ambiguous Terms Requiring Caution');
  });
});
