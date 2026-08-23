import type { FoodSummarySource } from '../sources/food-summary.source.js';
import {
  auditFoodSearchQuality,
  formatFoodSearchQualityReport,
} from './food-search-quality-audit.js';

const category = { id: 'category-1', name: 'Food', description: null };

function food(
  id: string,
  name: string,
  displayName: string,
  variantLabel: string | null = null,
  searchPriority = 0,
): FoodSummarySource {
  return {
    id,
    name,
    displayName,
    variantLabel,
    searchPriority,
    category,
  };
}

describe('food search quality audit', () => {
  it('audits ranked results without changing the ranker inputs', () => {
    const report = auditFoodSearchQuality([
      food('egg', 'Egg, whole, raw', 'Egg', null, 1),
      food('white', 'Egg, white, raw', 'Egg White'),
      food('bread', 'Bread, egg', 'Egg Bread'),
      food('technical', 'Egg, laboratory reference ingredient', 'Egg'),
    ]);

    const egg = report.queries.find((query) => query.query === 'egg');
    expect(egg?.results.slice(0, 3).map((result) => result.foodId)).toEqual([
      'egg',
      'technical',
      'white',
    ]);
    expect(egg?.results[0]).toMatchObject({
      displayName: 'Egg',
      matchTier: 1,
      rankScore: 100,
      matchReason: 'exact display-name match',
    });
    expect(egg?.issues).toContain('technical-food-ranked-high');
  });

  it('reports duplicates, diversity, and readable output', () => {
    const report = auditFoodSearchQuality([
      food('egg-1', 'Egg, whole, raw', 'Egg', 'Raw'),
      food('egg-2', 'Egg, whole, fresh', 'Egg', 'Fresh'),
      food('banana', 'Bananas, raw', 'Banana'),
    ]);

    const egg = report.queries.find((query) => query.query === 'egg');
    expect(egg?.duplicateConcepts).toEqual([
      { displayName: 'egg', count: 2, ranks: [1, 2] },
    ]);
    expect(egg?.diversity.distinctDisplayNames).toBe(1);

    const text = formatFoodSearchQualityReport(report);
    expect(text).toContain('Food Search Quality Audit');
    expect(text).toContain('Per-query findings');
    expect(text).toContain('Canonical: Egg, whole, fresh');
    expect(text).toContain('Canonical: Egg, whole, raw');
  });

  it('generates deterministic category coverage from available categories', () => {
    const report = auditFoodSearchQuality(
      [food('coffee', 'Beverages, coffee, brewed', 'Coffee')],
      ['Beverages', 'Meat, Poultry, and Eggs'],
      '2026-01-01T00:00:00.000Z',
    );

    expect(report.categoryCoverage).toEqual([
      {
        category: 'Beverages',
        query: 'beverage',
        matchedCandidateCount: 1,
        topDisplayNames: ['Coffee'],
      },
      {
        category: 'Meat, Poultry, and Eggs',
        query: 'egg',
        matchedCandidateCount: 0,
        topDisplayNames: [],
      },
    ]);
    expect(report.generatedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
