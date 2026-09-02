import { jest } from '@jest/globals';
import { MealPlannerService } from './meal-planner.service.js';
import type { MealPlannerAiExplanationService } from './meal-planner-ai-explanation.service.js';

function food(id: string, category = id) {
  return {
    id,
    name: `${id} canonical`,
    displayName: id,
    variantLabel: null,
    category: { id: `category-${category}`, name: category, description: null },
    planningClass: 'MEAL_ELIGIBLE' as const,
    servings: [{ id: `serving-${id}`, name: '1 serving', grams: '100' }],
    nutrients: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function daily() {
  return {
    date: '2026-08-30',
    entries: [],
    totals: { protein: { amount: '34', unit: 'g' }, sodium: { amount: '1000', unit: 'mg' } },
    targets: {
      protein: { current: '34', target: '50', remaining: '16', percentageConsumed: 68, unit: 'g', kind: 'LOWER_TARGET' as const, status: 'below-target' as const, rangeMin: null, rangeMax: null, source: 'CLINICIAN', approvalStatus: 'APPROVED' },
      sodium: { current: '1000', target: '2300', remaining: '1300', percentageConsumed: 43.48, unit: 'mg', kind: 'UPPER_LIMIT' as const, status: 'within-target' as const, rangeMin: null, rangeMax: null, source: 'SYSTEM', approvalStatus: 'APPROVED' },
    },
  };
}

function evaluation(score: number, contributions: readonly { nutrient: string; amount: string; unit?: string }[] = []) {
  return {
    evaluation: {
      score,
      coverage: 100,
      evaluationStatus: 'evaluated' as const,
      reasons: [],
      contributions: contributions.map((item) => ({
        ...item,
        targetValue: null,
        currentDailyValue: null,
        explanation: `${item.nutrient} contribution`,
      })),
      deferredPolicies: [],
      nutritionInsights: [],
    },
    targetCalculation: { targets: {}, adjustments: [], deferredPolicies: [], targetProvenance: [] },
  };
}

describe('MealPlannerService', () => {
  it.each(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const)('supports deterministic %s recommendations', async (mealType) => {
    const selectedFood = food('Planner Food');
    const repository = { findCandidateFoods: jest.fn().mockResolvedValue([selectedFood]), findFoodById: jest.fn().mockResolvedValue(selectedFood) };
    const evaluationService = {
      loadEvaluationContext: jest.fn().mockResolvedValue({ conditionCodes: [], evidence: {}, profile: null, energyGoal: 'maintenance', asOf: new Date() }),
      evaluateWithContext: jest.fn().mockResolvedValue(evaluation(90, [{ nutrient: 'protein', amount: '10', unit: 'g' }])),
      getPolicySetFingerprint: jest.fn().mockReturnValue('policy'),
    };
    const service = new MealPlannerService(repository as never, evaluationService as never, { getByDate: jest.fn().mockResolvedValue(daily()) } as never);

    const result = await service.recommend('user-1', { date: '2026-08-30', mealType });

    expect(result.mealType).toBe(mealType);
    expect(result.foods).toHaveLength(1);
  });

  it('evaluates candidates through FoodEvaluationService, ranks them, and aggregates the selected foods', async () => {
    const foods = [food('Apple', 'Fruit'), food('Chicken', 'Protein'), food('Oats', 'Grain')];
    const repository = {
      findCandidateFoods: jest.fn().mockResolvedValue(foods),
      findFoodById: jest.fn().mockImplementation(async (id: string) => foods.find((item) => item.id === id)),
    };
    const evaluations = new Map([
      ['Apple', evaluation(95, [{ nutrient: 'protein', amount: '2', unit: 'g' }, { nutrient: 'sodium', amount: '10', unit: 'mg' }])],
      ['Chicken', evaluation(90, [{ nutrient: 'protein', amount: '25', unit: 'g' }, { nutrient: 'sodium', amount: '300', unit: 'mg' }])],
      ['Oats', evaluation(92, [{ nutrient: 'protein', amount: '6', unit: 'g' }, { nutrient: 'sodium', amount: '2', unit: 'mg' }])],
    ]);
    const evaluationService = {
      loadEvaluationContext: jest.fn().mockResolvedValue({ conditionCodes: [], evidence: {}, profile: null, energyGoal: 'maintenance', asOf: new Date('2026-08-30T00:00:00.000Z') }),
      evaluateWithContext: jest.fn().mockImplementation(async (_userId: string, foodId: string) => evaluations.get(foodId)),
      getPolicySetFingerprint: jest.fn().mockReturnValue('policy-fingerprint'),
    };
    const dailyTracker = { getByDate: jest.fn().mockResolvedValue(daily()) };
    const service = new MealPlannerService(repository as never, evaluationService as never, dailyTracker as never);

    const result = await service.recommend('user-1', { date: '2026-08-30', mealType: 'BREAKFAST', focus: 'HIGH_PROTEIN', limit: 2 });

    expect(result.foods.map(({ foodId }) => foodId)).toEqual(['Chicken', 'Oats']);
    expect(result.summary).toEqual({
      protein: { amount: '31', unit: 'g' },
      sodium: { amount: '302', unit: 'mg' },
    });
    expect(result.remainingBudget.protein).toMatchObject({ current: '34', target: '50', remaining: '16' });
    expect(evaluationService.evaluateWithContext).toHaveBeenCalledTimes(3);
    expect(result.provenance).toMatchObject({ foodSource: 'canonical-food-database', policySetFingerprint: 'policy-fingerprint' });
  });

  it('does not invent targets and returns a valid empty response when no candidates are usable', async () => {
    const repository = { findCandidateFoods: jest.fn().mockResolvedValue([]), findFoodById: jest.fn() };
    const evaluationService = {
      loadEvaluationContext: jest.fn().mockResolvedValue({ conditionCodes: [], evidence: {}, profile: null, energyGoal: 'maintenance', asOf: new Date() }),
      evaluateWithContext: jest.fn(),
      getPolicySetFingerprint: jest.fn().mockReturnValue(null),
    };
    const dailyTracker = { getByDate: jest.fn().mockResolvedValue({ ...daily(), targets: {}, totals: {} }) };
    const service = new MealPlannerService(repository as never, evaluationService as never, dailyTracker as never);

    const result = await service.recommend('user-1', { date: '2026-08-30' });

    expect(result.foods).toEqual([]);
    expect(result.remainingBudget).toEqual({});
    expect(result.limitations).toContain('No eligible catalog foods with usable servings were available for this meal.');
    expect(evaluationService.evaluateWithContext).not.toHaveBeenCalled();
  });

  it('keeps AI optional and only attaches an explanation to an already deterministic result', async () => {
    const singleFood = food('Rice');
    const repository = { findCandidateFoods: jest.fn().mockResolvedValue([singleFood]), findFoodById: jest.fn().mockResolvedValue(singleFood) };
    const evaluationService = {
      loadEvaluationContext: jest.fn().mockResolvedValue({ conditionCodes: [], evidence: {}, profile: null, energyGoal: 'maintenance', asOf: new Date() }),
      evaluateWithContext: jest.fn().mockResolvedValue(evaluation(88, [{ nutrient: 'calories', amount: '200', unit: 'kcal' }])),
      getPolicySetFingerprint: jest.fn().mockReturnValue('policy'),
    };
    const dailyTracker = { getByDate: jest.fn().mockResolvedValue(daily()) };
    const ai = { explain: jest.fn().mockResolvedValue({ answer: 'These choices fit the available guidance.', providerId: 'gemini' }) };
    const service = new MealPlannerService(repository as never, evaluationService as never, dailyTracker as never, ai as unknown as MealPlannerAiExplanationService);

    const result = await service.recommend('user-1', { includeExplanation: true, limit: 1 });

    expect(ai.explain).toHaveBeenCalledTimes(1);
    expect(result.aiExplanation).toEqual({ answer: 'These choices fit the available guidance.', providerId: 'gemini' });
    expect(result.foods[0]?.score).toBe(88);
  });
});
