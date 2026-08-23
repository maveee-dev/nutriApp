import { jest } from '@jest/globals';
import { MealPlanningService } from './meal-planning.service.js';

describe('MealPlanningService', () => {
  it('uses complete recipe/template meals when the shadow planner has a valid selection', async () => {
    const foodsService = { findMany: jest.fn(), findDetailById: jest.fn().mockResolvedValue({ servings: [{ id: 'serving-chicken', name: '1 serving', grams: '100' }] }) };
    const policyService = { loadContext: jest.fn(), calculateFromContext: jest.fn() };
    const evaluationService = { evaluateWithContext: jest.fn(), getPolicySetFingerprint: jest.fn() };
    const shadowPlanner = {
      generate: jest.fn().mockResolvedValue({
        apiVersion: 'shadow-v1',
        userId: 'user-1',
        date: '2026-08-20',
        asOf: '2026-08-20T23:59:59.999Z',
        evaluatedCandidateCount: 1,
        candidates: [],
        selected: [{
          mealType: 'DINNER',
          templateId: 'template-1',
          templateVersionId: 'template-version-1',
          templateVersion: 1,
          templateName: 'Chicken Adobo Dinner',
          cuisine: 'Filipino',
          slotIds: ['slot-1'],
          resolvedSources: [{ slotId: 'slot-1', source: 'recipe', sourceId: 'recipe-version-1', label: 'Chicken Adobo' }],
          components: [{ id: 'component-1', foodId: 'food-chicken', foodName: 'Chicken', servingId: null, servingName: null, servingGrams: null, role: 'MAIN_DISH', quantity: '100', unit: 'GRAM', displayOrder: 1, notes: null }],
          templateProvenance: { sourceType: 'OFFICIAL', sourceName: 'NutriApp', sourceUrl: null, sourceReference: null, sourceVersion: '1', approvalStatus: 'APPROVED' },
          evaluation: {
            recipeId: 'shadow-meal:template-version-1', recipeVersionId: 'shadow-template-version:template-version-1', recipeVersion: 1, portionGrams: '100',
            evaluation: { score: 88, coverage: 100, reasons: [], contributions: [], deferredPolicies: [] },
            targetCalculation: { targets: { sodiumMilligrams: '2300' }, adjustments: [], deferredPolicies: [], targetProvenance: [] },
            components: [{ componentId: 'component-1', foodId: 'food-chicken', servingId: null, quantity: '100', unit: 'GRAM', portionGrams: '100', evaluation: { score: 80, coverage: 100, reasons: [], contributions: [] , deferredPolicies: [] } }],
            provenance: { evaluatorVersion: 'food-evaluation-v1', policySetFingerprint: 'policy-1', recipeFingerprint: 'recipe-fingerprint-1', canonicalFoods: [] },
            limitations: [],
          },
          rankInputs: { clinicalEligibility: 1, mealCompleteness: 1, compatibilityScore: 88, evidenceCoverage: 100, activePolicyCoverage: 1 },
          tieBreaker: 'template-version-1|DINNER|slot-1|recipe-fingerprint-1',
        }],
        provenance: { planner: 'recipe-template-shadow-planner', selection: 'deterministic-ranked-shadow-only', policySetFingerprints: ['policy-1'] },
      }),
    };
    const service = new MealPlanningService(foodsService as never, policyService as never, evaluationService as never, shadowPlanner as never);

    const result = await service.generate('user-1', '2026-08-20');

    expect(result.provenance.planner).toBe('recipe-template');
    expect(result.meals?.[0]?.name).toBe('Chicken Adobo Dinner');
    expect(result.meals?.[0]?.components[0]?.foodId).toBe('food-chicken');
    expect(result.meals?.[0]?.components[0]?.servingId).toBe('serving-chicken');
    expect(result.meals?.[0]?.components[0]?.quantity).toBe('1');
    expect(result.items[0]?.foodId).toBe('food-chicken');
    expect(foodsService.findMany).not.toHaveBeenCalled();
  });

  it('keeps the food planner as a compatibility fallback when no complete shadow meal exists', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: [], meta: {} }),
      findDetailById: jest.fn(),
    };
    const policyService = {
      loadContext: jest.fn().mockResolvedValue({ profile: null, conditionCodes: [], energyGoal: 'maintenance', asOf: new Date(), evidence: {} }),
      calculateFromContext: jest.fn().mockReturnValue({ targets: {}, adjustments: [], deferredPolicies: [], targetProvenance: [] }),
    };
    const evaluationService = { evaluateWithContext: jest.fn(), getPolicySetFingerprint: jest.fn().mockReturnValue(null) };
    const shadowPlanner = { generate: jest.fn().mockResolvedValue({ selected: [], provenance: { policySetFingerprints: [] } }) };
    const service = new MealPlanningService(foodsService as never, policyService as never, evaluationService as never, shadowPlanner as never);

    const result = await service.generate('user-1', '2026-08-20');

    expect(result.provenance.planner).toBe('food-fallback');
    expect(foodsService.findMany).toHaveBeenCalled();
  });

  it('generates deterministic meal slots from canonical foods and active policy targets', async () => {
    const foods = ['Apple', 'Beans', 'Chicken', 'Oats'].map((name, index) => ({
      id: `food-${index}`,
      name,
      category: { id: `category-${index}`, name: `Category ${index}`, description: null },
      servings: [{ id: `serving-${index}`, name: '1 serving', grams: '100' }],
      nutrients: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: foods.map(({ id, name, category }) => ({ id, name, category })), meta: {} }),
      findDetailById: jest.fn().mockImplementation(async (id: string) => foods.find((food) => food.id === id)),
    };
    const policyService = {
      loadContext: jest.fn().mockResolvedValue({ profile: null, conditionCodes: [], energyGoal: 'maintenance', asOf: new Date(), evidence: {} }),
      calculateFromContext: jest.fn().mockReturnValue({ targets: { sodiumMilligrams: '2300', proteinGrams: null }, adjustments: [], deferredPolicies: [], targetProvenance: [{ target: 'sodiumMilligrams', policyId: 'general-nutrition-sodium-v1', source: 'FDA', version: 'v1', explanation: 'Approved.' }] }),
    };
    const evaluationService = {
      evaluateWithContext: jest.fn().mockImplementation(async (_userId: string, foodId: string) => ({ evaluation: { score: Number(foodId.slice(-1)) * 10, coverage: 100, reasons: [], contributions: [], deferredPolicies: [] } })),
      getPolicySetFingerprint: jest.fn().mockReturnValue('policy-fingerprint-1'),
    };
    const service = new MealPlanningService(foodsService as never, policyService as never, evaluationService as never);

    const result = await service.generate('user-1', '2026-08-19');
    expect(result.date).toBe('2026-08-19');
    expect(result.asOf).toBe('2026-08-19T23:59:59.999Z');
    expect(result.items.map(({ mealType }) => mealType)).toEqual(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']);
    expect(result.items.map(({ foodId }) => foodId)).toEqual(['food-3', 'food-2', 'food-1', 'food-0']);
    expect(result.policySetFingerprint).toBe('policy-fingerprint-1');
    expect(result.items[0]?.evaluation.score).toBe(30);
  });

  it('never selects alcohol, condiments, beverages, or ingredients as complete meals', async () => {
    const foods = [
      { id: 'beer', name: 'Beer', planningClass: 'ALCOHOL' as const, category: { id: 'beer-category', name: 'Beverages', description: null }, servings: [{ id: 'beer-serving', name: 'can', grams: '355' }], nutrients: [], createdAt: new Date(), updatedAt: new Date() },
      { id: 'sauce', name: 'Tomato Sauce', planningClass: 'CONDIMENT' as const, category: { id: 'sauce-category', name: 'Condiments', description: null }, servings: [{ id: 'sauce-serving', name: 'tablespoon', grams: '15' }], nutrients: [], createdAt: new Date(), updatedAt: new Date() },
      { id: 'spice', name: 'Black Pepper', planningClass: 'INGREDIENT' as const, category: { id: 'spice-category', name: 'Spices', description: null }, servings: [{ id: 'spice-serving', name: 'teaspoon', grams: '2' }], nutrients: [], createdAt: new Date(), updatedAt: new Date() },
      { id: 'meal', name: 'Chicken Bowl', planningClass: 'MEAL_ELIGIBLE' as const, category: { id: 'meal-category', name: 'Prepared Meals', description: null }, servings: [{ id: 'meal-serving', name: 'bowl', grams: '350' }], nutrients: [], createdAt: new Date(), updatedAt: new Date() },
    ];
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: foods, meta: {} }),
      findDetailById: jest.fn().mockImplementation(async (id: string) => foods.find((food) => food.id === id)),
    };
    const policyService = {
      loadContext: jest.fn().mockResolvedValue({ profile: null, conditionCodes: [], energyGoal: 'maintenance', asOf: new Date(), evidence: {} }),
      calculateFromContext: jest.fn().mockReturnValue({ targets: {}, adjustments: [], deferredPolicies: [], targetProvenance: [] }),
    };
    const evaluationService = {
      evaluateWithContext: jest.fn().mockResolvedValue({ evaluation: { score: 100, coverage: 100, reasons: [], contributions: [], deferredPolicies: [] } }),
      getPolicySetFingerprint: jest.fn().mockReturnValue('policy-fingerprint-1'),
    };
    const service = new MealPlanningService(foodsService as never, policyService as never, evaluationService as never);

    const result = await service.generate('user-1', '2026-08-19');

    expect(result.items.map(({ foodId }) => foodId)).toEqual(['meal']);
  });

  it('returns an empty but valid plan when the current catalog has no usable servings', async () => {
    const foodsService = {
      findMany: jest.fn().mockResolvedValue({ items: [{ id: 'food-without-serving', name: 'Unusable food', category: { id: 'category-1', name: 'Other', description: null } }], meta: {} }),
      findDetailById: jest.fn().mockResolvedValue({ id: 'food-without-serving', name: 'Unusable food', category: { id: 'category-1', name: 'Other', description: null }, servings: [], nutrients: [], createdAt: new Date(), updatedAt: new Date() }),
    };
    const policyService = {
      loadContext: jest.fn().mockResolvedValue({ profile: null, conditionCodes: [], energyGoal: 'maintenance', asOf: new Date(), evidence: {} }),
      calculateFromContext: jest.fn().mockReturnValue({ targets: {}, adjustments: [], deferredPolicies: [], targetProvenance: [] }),
    };
    const evaluationService = { evaluateWithContext: jest.fn(), getPolicySetFingerprint: jest.fn().mockReturnValue(null) };
    const service = new MealPlanningService(foodsService as never, policyService as never, evaluationService as never);

    const result = await service.generate('user-1', '2026-08-20');

    expect(result).toMatchObject({ apiVersion: 'v1', date: '2026-08-20', items: [] });
    expect(evaluationService.evaluateWithContext).not.toHaveBeenCalled();
  });
});
