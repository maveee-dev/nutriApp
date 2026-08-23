import {
  auditFoodPresentationRecords,
  type FoodPresentationAuditRecord,
} from './food-presentation-quality-audit.js';

function record(
  id: string,
  name: string,
  presentation?: FoodPresentationAuditRecord['presentation'],
): FoodPresentationAuditRecord {
  return { id, name, presentation };
}

describe('food presentation quality audit', () => {
  it('flags a lost primary concept and generic category title', () => {
    const report = auditFoodPresentationRecords([
      record('nut-1', 'Nuts, almonds', { displayNameOverride: 'Nut' }),
    ], '2026-01-01T00:00:00.000Z');

    expect(report.summary.issueCounts['incorrect-primary-concept']).toBe(1);
    expect(report.summary.issueCounts['generic-category-title']).toBe(1);
    expect(report.reviewBySeverity.HIGH).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          foodId: 'nut-1',
          canonicalName: 'Nuts, almonds',
        }),
      ]),
    );
  });

  it('flags a brand used as the title but exempts product brands', () => {
    const report = auditFoodPresentationRecords([
      record('applebees-1', "APPLEBEE'S, Double Crunch Shrimp", {
        displayNameOverride: "Applebee's",
      }),
      record('oreo-1', 'Oreo, cookies'),
    ]);

    expect(report.summary.issueCounts['brand-used-as-title']).toBe(1);
    expect(report.reviewBySeverity.MEDIUM[0]).toMatchObject({
      foodId: 'applebees-1',
      issueType: 'brand-used-as-title',
    });
  });

  it('flags deterministic grammar and pluralization defects', () => {
    const report = auditFoodPresentationRecords([
      record('cookie-1', 'Cookies, oatmeal', { displayNameOverride: 'Cooky' }),
      record('peach-1', 'Peaches, raw', { displayNameOverride: 'Peache' }),
    ]);

    expect(report.summary.issueCounts['grammar-or-pluralization']).toBe(2);
    expect(report.reviewBySeverity.HIGH).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ foodId: 'cookie-1' }),
        expect.objectContaining({ foodId: 'peach-1' }),
      ]),
    );
  });

  it('groups duplicate display names and preserves deterministic ordering', () => {
    const report = auditFoodPresentationRecords([
      record('egg-2', 'Eggs, whole, raw'),
      record('egg-1', 'Egg, whole, raw'),
      record('apple-1', 'Apple, raw'),
    ]);

    expect(report.summary.issueCounts['duplicate-display-name']).toBe(2);
    expect(report.duplicateDisplayNameGroups[0]).toMatchObject({
      displayName: 'Egg',
      count: 2,
      foods: [
        { id: 'egg-1' },
        { id: 'egg-2' },
      ],
    });
  });

  it('does not flag duplicate display names when effective variants distinguish foods', () => {
    const report = auditFoodPresentationRecords([
      record('egg-1', 'Egg, whole, raw'),
      record('egg-2', 'Egg, whole, fresh'),
    ]);

    expect(report.summary.issueCounts['duplicate-display-name']).toBe(0);
    expect(report.duplicateDisplayNameGroups).toHaveLength(0);
  });

  it('only includes the ambiguous subset when a display group has mixed variants', () => {
    const report = auditFoodPresentationRecords([
      record('egg-1', 'Egg, whole, raw'),
      record('egg-2', 'Eggs, whole, raw'),
      record('egg-3', 'Egg, whole, fresh'),
    ]);

    expect(report.duplicateDisplayNameGroups).toHaveLength(1);
    expect(report.duplicateDisplayNameGroups[0]?.foods.map((food) => food.id)).toEqual([
      'egg-1',
      'egg-2',
    ]);
    expect(report.summary.issueCounts['duplicate-display-name']).toBe(2);
  });

  it('groups findings by reusable grammar rule', () => {
    const report = auditFoodPresentationRecords([
      record('almond-1', 'Nuts, almonds', { displayNameOverride: 'Nut' }),
      record('almond-2', 'Nuts, almond butter', { displayNameOverride: 'Nut' }),
      record('cheese-1', 'Cheese, American', { displayNameOverride: 'Cheese' }),
    ]);

    expect(report.issuesByGrammarRule).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          grammarRule: 'nuts-and-seeds',
          description: expect.stringContaining('nut'),
        }),
        expect.objectContaining({ grammarRule: 'cheese-types' }),
      ]),
    );
  });

  it('flags repeated or empty variant labels without changing presentation data', () => {
    const report = auditFoodPresentationRecords([
      record('variant-1', 'Egg, whole, raw', {
        variantLabelOverride: 'Raw · Raw',
      }),
      record('variant-2', 'Apple'),
    ]);

    expect(report.summary.issueCounts['empty-or-redundant-variant']).toBe(1);
    expect(report.summary.needsManualReview).toBe(1);
  });

  it('does not flag a straightforward presentation as needing review', () => {
    const report = auditFoodPresentationRecords([
      record('egg-1', 'Egg, whole, raw'),
    ]);

    expect(report.summary.needsManualReview).toBe(0);
    expect(report.summary.confidence.high).toBe(1);
  });
});
