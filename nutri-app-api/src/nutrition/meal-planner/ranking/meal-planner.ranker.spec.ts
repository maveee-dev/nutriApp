import { Decimal } from 'decimal.js';
import { candidateFitsCalorieBudget, rankMealPlannerCandidates } from './meal-planner.ranker.js';
import type { MealPlannerRankedCandidate } from './meal-planner.ranker.js';

function candidate(id: string, score: number, nutrients: Record<string, string>, category = id): MealPlannerRankedCandidate {
  return {
    food: {
      id,
      name: id,
      displayName: id,
      variantLabel: null,
      category: { id: `category-${category}`, name: category, description: null },
      servings: [{ id: `serving-${id}`, name: '1 serving', grams: '100' }],
      nutrients: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    serving: { id: `serving-${id}`, name: '1 serving', grams: '100' },
    evaluation: {
      score,
      coverage: 100,
      reasons: [],
      deferredPolicies: [],
      contributions: Object.entries(nutrients).map(([nutrient, amount]) => ({
        nutrient,
        unit: nutrient === 'protein' || nutrient === 'fiber' ? 'g' : nutrient === 'calories' ? 'kcal' : 'mg',
        amount,
        targetValue: null,
        currentDailyValue: null,
        explanation: `${nutrient} contribution`,
      })),
    },
  };
}

describe('Meal planner ranking', () => {
  it('prioritizes candidates that fit the known remaining budget before stable ties', () => {
    const result = rankMealPlannerCandidates([
      candidate('over-budget', 100, { sodium: '900' }),
      candidate('within-budget', 90, { sodium: '300' }),
    ], 'BALANCED', {
      sodium: { current: '1000', target: '2300', remaining: '500', unit: 'mg', status: 'within-target' },
    });

    expect(result.map(({ food }) => food.id)).toEqual(['within-budget', 'over-budget']);
  });

  it('uses the requested focus without changing the supplied evaluation score', () => {
    const result = rankMealPlannerCandidates([
      candidate('low-protein', 90, { protein: '5' }),
      candidate('high-protein', 80, { protein: '25' }),
    ], 'HIGH_PROTEIN', {});

    expect(result.map(({ food }) => food.id)).toEqual(['high-protein', 'low-protein']);
    expect(result[0]?.evaluation.score).toBe(80);
  });

  it('orders equal candidates deterministically by category, display name, canonical name, and id', () => {
    const result = rankMealPlannerCandidates([
      candidate('z-food', 80, { fiber: '4' }, 'Vegetables'),
      candidate('a-food', 80, { fiber: '4' }, 'Vegetables'),
      candidate('other-category', 80, { fiber: '4' }, 'Fruit'),
    ], 'HIGH_FIBER', {});

    expect(result.map(({ food }) => food.id)).toEqual(['other-category', 'a-food', 'z-food']);
    expect(new Decimal('1.20').plus('0.30').toString()).toBe('1.5');
  });

  it('filters candidates against an explicit calorie budget without changing their nutrient values', () => {
    expect(candidateFitsCalorieBudget(candidate('small', 90, { calories: '280' }), '400')).toBe(true);
    expect(candidateFitsCalorieBudget(candidate('large', 90, { calories: '401' }), '400')).toBe(false);
    expect(candidateFitsCalorieBudget(candidate('unknown', 90, { protein: '10' }), '400')).toBe(false);
  });
});
