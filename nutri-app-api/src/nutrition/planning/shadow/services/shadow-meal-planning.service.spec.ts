import { jest } from '@jest/globals';
import { ShadowMealPlanningService } from './shadow-meal-planning.service.js';
import { ShadowPlanningInstrumentation } from './shadow-planning-instrumentation.js';
import { FoodEvaluationEngine } from '../../../evaluation/services/food-evaluation.engine.js';
import { RecipeEvaluationService } from '../../../recipes/services/recipe-evaluation.service.js';

const food = (id: string, planningClass = 'MEAL_ELIGIBLE') => ({
  id,
  name: id,
  planningClass,
  servings: [{ id: `${id}-serving`, name: '1 serving', grams: '100' }],
  category: { id: 'category-1', name: 'Meal', description: null },
  nutrients: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

const recipe = {
  id: 'recipe-version-1',
  version: 1,
  name: 'Chicken Adobo',
  description: null,
  cuisine: 'Filipino',
  mealTypes: ['LUNCH'],
  yieldServings: '2',
  sourceType: 'OFFICIAL',
  sourceName: 'Test',
  sourceUrl: null,
  sourceReference: null,
  sourceVersion: '1',
  approvalStatus: 'APPROVED',
  approvedAt: new Date(),
  approvedByUserId: null,
  createdAt: new Date(),
  components: [{ id: 'component-1', foodId: 'food-1', foodName: 'Chicken', servingId: 'food-1-serving', servingName: '1 serving', servingGrams: '100', role: 'MAIN_DISH', quantity: '1', unit: 'SERVING', displayOrder: 0, notes: null }],
};

const template = (allowFallback: boolean) => ({
  id: 'template-1', ownerId: null, visibility: 'SHARED', createdAt: new Date(), updatedAt: new Date(),
  versions: [{
    id: 'template-version-1', version: 1, name: 'Lunch pattern', description: null, cuisine: 'Filipino', mealTypes: ['LUNCH'],
    sourceType: 'OFFICIAL', sourceName: 'Test', sourceUrl: null, sourceReference: null, sourceVersion: '1', approvalStatus: 'APPROVED', approvedAt: new Date(), approvedByUserId: null, createdAt: new Date(),
    slots: [{ id: 'slot-1', role: 'MAIN_DISH', kind: 'PARAMETERIZED', name: 'Main Dish', required: true, allowCanonicalFoodFallback: allowFallback, displayOrder: 0, recipeVersionId: null, recipeId: null, recipeName: null, recipeVersion: null, foodId: null, foodName: null, servingId: null, servingName: null, quantity: null, unit: null, notes: null }],
  }],
});

const evaluation = (fingerprint: string, evaluationStatus?: 'evaluated' | 'insufficient-evidence') => ({
  recipeId: 'shadow', recipeVersionId: 'shadow-version', recipeVersion: 1, portionGrams: '100',
  evaluation: { score: 80, coverage: 1, reasons: [], contributions: [], deferredPolicies: [], ...(evaluationStatus == null ? {} : { evaluationStatus }) },
  targetCalculation: { targets: { sodiumMilligrams: '2300', proteinGrams: '100' }, adjustments: [], deferredPolicies: [], targetProvenance: [] },
  components: [],
  provenance: { evaluatorVersion: 'food-evaluation-v1', policySetFingerprint: 'policy-set-1', recipeFingerprint: fingerprint, canonicalFoods: [] },
  limitations: [],
});

describe('ShadowMealPlanningService', () => {
  it('prefers approved recipe candidates over canonical food fallback', async () => {
    const evaluateComposition = jest.fn().mockResolvedValue(evaluation('recipe-fingerprint'));
    const service = new ShadowMealPlanningService(
      { findMany: jest.fn().mockResolvedValue([template(true)]) } as never,
      { findMany: jest.fn().mockResolvedValue([{ id: 'recipe-1', versions: [recipe] }]) } as never,
      { findMany: jest.fn().mockResolvedValue({ items: [{ id: 'food-1' }], meta: {} }), findDetailById: jest.fn().mockResolvedValue(food('food-1')) } as never,
      { evaluateComposition } as never,
    );

    const instrumentation = new ShadowPlanningInstrumentation();
    const result = await service.generate('user-1', '2026-08-20', 'LUNCH', instrumentation);
    const metrics = instrumentation.snapshot();

    expect(result.selected).toHaveLength(1);
    expect(evaluateComposition).toHaveBeenCalledTimes(1);
    expect(evaluateComposition.mock.calls[0]?.[1].components[0].id).toBe('slot-1:component-1');
    expect(metrics).toMatchObject({ templatesEvaluated: 1, recipesEvaluated: 1, recipeEvaluations: 1, candidateMealsGenerated: 1, policyEvaluations: 1, nutritionAggregations: 1, maximumSlotCombinations: 1 });
  });

  it('does not rank a high-carbohydrate recipe lower when carbohydrate is a lower-target contribution', async () => {
    const alternate = {
      ...recipe,
      id: 'recipe-version-2',
      name: 'High Carbohydrate Dish',
      components: [{ ...recipe.components[0], id: 'component-2', foodId: 'food-2', foodName: 'High Carbohydrate Food', servingId: 'food-2-serving', servingName: '1 serving' }],
    };
    const recipesService = { findMany: jest.fn().mockResolvedValue([{ id: 'recipe-1', versions: [recipe, alternate] }]) };
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: [{ id: 'food-1' }, { id: 'food-2' }], meta: {} }),
      findDetailById: jest.fn().mockImplementation(async (id: string) => ({
        id,
        source: 'USDA',
        sourceId: id,
        name: id,
        category: { id: 'category-1', name: 'Meal', description: null },
        planningClass: 'MEAL_ELIGIBLE',
        servings: [{ id: `${id}-serving`, name: '1 serving', grams: '100' }],
        nutrients: [
          { nutrient: { id: `${id}-sodium`, name: 'Sodium', unit: 'mg', description: null }, amount: '0' },
          { nutrient: { id: `${id}-carbohydrates`, name: 'Carbohydrates', unit: 'g', description: null }, amount: id === 'food-2' ? '200' : '20' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };
    const targetCalculation = {
      targets: { sodiumMilligrams: '2300', proteinGrams: null, carbohydrateGrams: '180' },
      adjustments: [],
      deferredPolicies: [],
      targetProvenance: [{ target: 'carbohydrateGrams' as const, policyId: 'diabetes-carbohydrate-target-v1', source: 'ADA', version: '2026', explanation: 'Approved individualized target.' }],
    };
    const policyService = {
      loadContext: jest.fn(),
      calculateFromContext: jest.fn().mockReturnValue(targetCalculation),
      getPolicySetFingerprint: jest.fn().mockReturnValue('policy-set-diabetes'),
    };
    const recipeEvaluationService = new RecipeEvaluationService(
      recipesService as never,
      foodsService as never,
      policyService as never,
      new FoodEvaluationEngine(),
    );
    const service = new ShadowMealPlanningService(
      { findMany: jest.fn().mockResolvedValue([template(false)]) } as never,
      recipesService as never,
      foodsService as never,
      recipeEvaluationService,
    );

    const result = await service.generate('user-1', '2026-08-20', 'LUNCH');

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map(({ evaluation }) => evaluation.evaluation.score)).toEqual([100, 100]);
    expect(result.candidates.find(({ resolvedSources }) => resolvedSources[0]?.sourceId === 'recipe-version-2')?.evaluation.evaluation.contributions)
      .toContainEqual(expect.objectContaining({ nutrient: 'carbohydrates', amount: '200', targetValue: '180' }));
    expect(result.selected[0]?.resolvedSources[0]?.sourceId).toBe('recipe-version-1');
  });

  it('does not use canonical fallback unless the slot explicitly permits it', async () => {
    const evaluateComposition = jest.fn().mockResolvedValue(evaluation('food-fingerprint'));
    const service = new ShadowMealPlanningService(
      { findMany: jest.fn().mockResolvedValue([template(false)]) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      { findMany: jest.fn().mockResolvedValue({ items: [{ id: 'food-1' }], meta: {} }), findDetailById: jest.fn().mockResolvedValue(food('food-1')) } as never,
      { evaluateComposition } as never,
    );

    const result = await service.generate('user-1', '2026-08-20', 'LUNCH');

    expect(result.evaluatedCandidateCount).toBe(0);
    expect(evaluateComposition).not.toHaveBeenCalled();
  });

  it('ranks insufficient-evidence candidates below evaluated candidates', async () => {
    const alternate = {
      ...recipe,
      id: 'recipe-version-2',
      name: 'Alternative Dish',
      components: [{ ...recipe.components[0], id: 'component-2', foodId: 'food-2', foodName: 'Alternative Food' }],
    };
    const evaluateComposition = jest.fn().mockImplementation(async (_userId: string, input: { components: readonly { foodId: string }[] }) =>
      evaluation(input.components[0]?.foodId === 'food-1' ? 'insufficient-fingerprint' : 'evaluated-fingerprint', input.components[0]?.foodId === 'food-1' ? 'insufficient-evidence' : 'evaluated'));
    const service = new ShadowMealPlanningService(
      { findMany: jest.fn().mockResolvedValue([template(false)]) } as never,
      { findMany: jest.fn().mockResolvedValue([{ id: 'recipe-1', versions: [recipe, alternate] }]) } as never,
      { findMany: jest.fn().mockResolvedValue({ items: [], meta: {} }), findDetailById: jest.fn() } as never,
      { evaluateComposition } as never,
    );

    const result = await service.generate('user-1', '2026-08-20', 'LUNCH');

    expect(result.candidates[0]?.evaluation.evaluation.evaluationStatus).toBe('evaluated');
    expect(result.selected[0]?.evaluation.evaluation.evaluationStatus).toBe('evaluated');
  });

  it('excludes unsafe fallback classes even when fallback is enabled', async () => {
    const evaluateComposition = jest.fn().mockResolvedValue(evaluation('food-fingerprint'));
    const service = new ShadowMealPlanningService(
      { findMany: jest.fn().mockResolvedValue([template(true)]) } as never,
      { findMany: jest.fn().mockResolvedValue([]) } as never,
      { findMany: jest.fn().mockResolvedValue({ items: [{ id: 'beer' }], meta: {} }), findDetailById: jest.fn().mockResolvedValue(food('beer', 'ALCOHOL')) } as never,
      { evaluateComposition } as never,
    );

    const result = await service.generate('user-1', '2026-08-20', 'LUNCH');

    expect(result.evaluatedCandidateCount).toBe(0);
    expect(evaluateComposition).not.toHaveBeenCalled();
  });

  it('uses Meal Assessment as a meal-fit tie-break without replacing food compatibility', async () => {
    const alternate = {
      ...recipe,
      id: 'recipe-version-2',
      name: 'Alternative Dish',
      components: [{ ...recipe.components[0], id: 'component-2', foodId: 'food-2', foodName: 'Alternative Food' }],
    };
    const mealAssessment = (status: 'evaluated' | 'insufficient-evidence', coverage: number) => ({
      status,
      coverage,
      contributions: [],
      rules: [],
      deferredPolicies: [],
      limitations: [],
      evaluatorVersion: 'food-evaluation-v3',
      policySetFingerprint: 'policy-set-1',
      evaluationFingerprint: `assessment-${status}`,
    });
    const evaluateComposition = jest.fn().mockImplementation(async (_userId: string, input: { components: readonly { foodId: string }[] }) => ({
      ...evaluation(input.components[0]?.foodId === 'food-1' ? 'compatibility-a' : 'compatibility-b'),
      mealAssessment: mealAssessment(input.components[0]?.foodId === 'food-1' ? 'insufficient-evidence' : 'evaluated', input.components[0]?.foodId === 'food-1' ? 0 : 100),
    }));
    const service = new ShadowMealPlanningService(
      { findMany: jest.fn().mockResolvedValue([template(false)]) } as never,
      { findMany: jest.fn().mockResolvedValue([{ id: 'recipe-1', versions: [recipe, alternate] }]) } as never,
      { findMany: jest.fn().mockResolvedValue({ items: [], meta: {} }), findDetailById: jest.fn() } as never,
      { evaluateComposition } as never,
    );

    const dailyAdherence = {
      status: 'available' as const,
      targetValue: '180',
      consumedValue: '60',
      remainingValue: '120',
      exceededValue: '0',
      coveragePercentage: 100,
      targetProvenance: null,
      snapshotIds: ['snapshot-1'],
      deferredPolicy: null,
    };
    const result = await service.generate('user-1', '2026-08-20', 'LUNCH', undefined, { dailyAdherence });

    expect(result.candidates.map(({ evaluation }) => evaluation.evaluation.score)).toEqual([80, 80]);
    expect(result.selected[0]?.resolvedSources[0]?.sourceId).toBe('recipe-version-2');
    expect(result.candidates.map(({ rankInputs }) => rankInputs.dailyAdherenceStatus)).toEqual(['available', 'available']);
    expect(result.dailyAdherence).toEqual(dailyAdherence);
  });

  it('re-evaluates a meal after an approved slot recipe substitution', async () => {
    const evaluateComposition = jest.fn().mockResolvedValue(evaluation('customized-fingerprint'));
    const service = new ShadowMealPlanningService(
      { findMany: jest.fn().mockResolvedValue([template(true)]) } as never,
      { findMany: jest.fn().mockResolvedValue([{ id: 'recipe-1', versions: [recipe] }]) } as never,
      { findMany: jest.fn().mockResolvedValue({ items: [{ id: 'food-1' }], meta: {} }), findDetailById: jest.fn().mockResolvedValue(food('food-1')) } as never,
      { evaluateComposition } as never,
    );

    const result = await service.customize('user-1', {
      templateVersionId: 'template-version-1',
      mealType: 'LUNCH',
      substitutions: [{ slotId: 'slot-1', recipeVersionId: 'recipe-version-1' }],
    });

    expect(result.resolvedSources[0]).toMatchObject({ source: 'recipe', sourceId: 'recipe-version-1', label: 'Chicken Adobo' });
    expect(evaluateComposition).toHaveBeenCalledTimes(1);
    expect(evaluateComposition.mock.calls[0]?.[1].recipeId).toBe('customized-meal:template-version-1');
  });
});
