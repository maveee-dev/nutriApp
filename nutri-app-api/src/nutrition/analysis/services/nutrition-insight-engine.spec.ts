import { NutritionInsightEngine } from './nutrition-insight-engine.js';
import { NutritionTotal } from '../types/nutrition-total.type.js';
import { NutritionTargets } from '../types/nutrition-targets.type.js';

const total = (name: string, unit: string, amount: string): NutritionTotal => ({
  name,
  unit,
  amount,
});

describe('NutritionInsightEngine', () => {
  const engine = new NutritionInsightEngine();
  const targets = (proteinGrams: string | null = '60'): NutritionTargets => ({
    sodiumMilligrams: '2300',
    proteinGrams,
  });

  it('reports sodium above the configured daily threshold', () => {
    expect(engine.evaluate([total('Sodium', 'mg', '2300.1')], targets())).toEqual([
      expect.objectContaining({
        ruleId: 'sodium-daily-threshold',
        severity: 'warning',
        measuredValue: '2300.1',
        targetValue: '2300',
      }),
    ]);
  });

  it('reports protein below 0.8 grams per kilogram', () => {
    expect(engine.evaluate([total('Protein', 'g', '55')], targets())).toEqual([
      expect.objectContaining({
        ruleId: 'protein-below-weight-target',
        measuredValue: '55',
        targetValue: '60',
      }),
    ]);
  });

  it('evaluates rules in a stable sequence', () => {
    const insights = engine.evaluate(
      [total('Protein', 'g', '10'), total('Sodium', 'mg', '3000')],
      targets(),
    );
    expect(insights.map((insight) => insight.ruleId)).toEqual([
      'sodium-daily-threshold',
      'protein-below-weight-target',
    ]);
  });

  it('omits protein insight when its target is unavailable', () => {
    expect(engine.evaluate([total('Protein', 'g', '10')], targets(null))).toEqual([]);
  });

  it('does not report values at or below their thresholds', () => {
    expect(
      engine.evaluate(
        [total('Sodium', 'mg', '2300'), total('Protein', 'g', '60')],
        targets(),
      ),
    ).toEqual([]);
  });

  it('ignores nutrients with incompatible units', () => {
    expect(engine.evaluate([total('Sodium', 'g', '3'), total('Protein', 'mg', '10')], targets())).toEqual([]);
  });
});
