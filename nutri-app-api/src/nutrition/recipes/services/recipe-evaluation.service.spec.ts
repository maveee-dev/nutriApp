import { jest } from '@jest/globals';
import { FoodEvaluationEngine } from '../../evaluation/services/food-evaluation.engine.js';
import { RecipeEvaluationValidationError } from '../errors/recipe-evaluation-validation.error.js';
import { RecipeEvaluationService } from './recipe-evaluation.service.js';

const targetCalculation = {
  targets: { sodiumMilligrams: '2300', proteinGrams: '100' },
  adjustments: [],
  deferredPolicies: [],
  targetProvenance: [],
  resolvedRules: [{
    family: 'numeric-constraint' as const,
    kind: 'upper-limit' as const,
    roles: ['compatibility', 'progress'] as const,
    scopes: ['food', 'meal', 'daily'] as const,
    measurementKey: 'sodium',
    unit: 'mg',
    weight: 1,
    target: 'sodiumMilligrams' as const,
    targetValue: '2300',
    policyId: 'general-nutrition-sodium-v1',
    policyVersion: 'v1',
    conflictKey: 'nutrition-target:sodiumMilligrams:daily-upper-limit',
    precedence: 10,
  }],
};

function food(id: string, name: string, protein: string, sodium: string) {
  return {
    id,
    source: 'USDA',
    sourceId: id,
    name,
    category: { id: 'category-1', name: 'Test', description: null },
    planningClass: 'MEAL_ELIGIBLE' as const,
    servings: [{ id: `${id}-serving`, name: '1 serving', grams: '100' }],
    nutrients: [
      { nutrient: { id: `${id}-protein`, name: 'Protein', unit: 'g', description: null }, amount: protein },
      { nutrient: { id: `${id}-sodium`, name: 'Sodium', unit: 'mg', description: null }, amount: sodium },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function recipeVersion() {
  return {
    id: 'recipe-version-1',
    version: 1,
    name: 'Test Bowl',
    description: null,
    cuisine: 'Test',
    mealTypes: ['LUNCH'],
    yieldServings: '2',
    sourceType: 'OFFICIAL',
    sourceName: 'Test source',
    sourceUrl: null,
    sourceReference: null,
    sourceVersion: '1',
    approvalStatus: 'APPROVED',
    approvedAt: new Date(),
    approvedByUserId: null,
    createdAt: new Date(),
    components: [
      { id: 'component-1', foodId: 'food-1', foodName: 'Chicken', servingId: 'food-1-serving', servingName: '1 serving', servingGrams: '100', role: 'MAIN_DISH', quantity: '1', unit: 'SERVING', displayOrder: 0, notes: null },
      { id: 'component-2', foodId: 'food-2', foodName: 'Rice', servingId: 'food-2-serving', servingName: '1 serving', servingGrams: '100', role: 'STAPLE', quantity: '1', unit: 'SERVING', displayOrder: 1, notes: null },
    ],
  };
}

describe('RecipeEvaluationService', () => {
  it('aggregates canonical component nutrients and evaluates the recipe with the existing engine', async () => {
    const recipesService = { findById: jest.fn().mockResolvedValue({ id: 'recipe-1', ownerId: 'user-1', visibility: 'PRIVATE', versions: [recipeVersion()] }) };
    const foodsService = { findDetailById: jest.fn().mockImplementation(async (id: string) => id === 'food-1' ? food('food-1', 'Chicken', '20', '100') : food('food-2', 'Rice', '5', '2')) };
    const policyService = { loadContext: jest.fn().mockResolvedValue({ profile: null, conditionCodes: [], energyGoal: 'maintenance', asOf: new Date(), evidence: {} }), calculateFromContext: jest.fn().mockReturnValue(targetCalculation), getPolicySetFingerprint: jest.fn().mockReturnValue('policy-set-1') };
    const service = new RecipeEvaluationService(recipesService as never, foodsService as never, policyService as never, new FoodEvaluationEngine());

    const result = await service.evaluate('user-1', 'recipe-1');

    expect(result.recipeVersionId).toBe('recipe-version-1');
    expect(result.portionGrams).toBe('100');
    expect(result.components.map(({ portionGrams }) => portionGrams)).toEqual(['50', '50']);
    expect(result.evaluation.reasons).toEqual(expect.arrayContaining([expect.objectContaining({ nutrient: 'sodium', measuredValue: '51' })]));
    expect(result.provenance.policySetFingerprint).toBe('policy-set-1');
    expect(result.provenance.canonicalFoods).toHaveLength(2);
    expect(result.provenance.recipeFingerprint).toHaveLength(64);
    expect(result.mealAssessment).toEqual(expect.objectContaining({ status: 'evaluated', coverage: 100 }));
    expect(result.mealAssessment?.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: expect.objectContaining({ policyId: 'general-nutrition-sodium-v1' }) }),
    ]));
  });

  it('rejects unapproved versions before attempting nutrient evaluation', async () => {
    const version = { ...recipeVersion(), approvalStatus: 'DRAFT' };
    const recipesService = { findById: jest.fn().mockResolvedValue({ id: 'recipe-1', ownerId: 'user-1', visibility: 'PRIVATE', versions: [version] }) };
    const foodsService = { findDetailById: jest.fn() };
    const policyService = { loadContext: jest.fn(), calculateFromContext: jest.fn(), getPolicySetFingerprint: jest.fn() };
    const service = new RecipeEvaluationService(recipesService as never, foodsService as never, policyService as never, new FoodEvaluationEngine());

    await expect(service.evaluate('user-1', 'recipe-1')).rejects.toBeInstanceOf(RecipeEvaluationValidationError);
    expect(foodsService.findDetailById).not.toHaveBeenCalled();
  });

  it('uses the requested eaten serving multiplier for the same immutable recipe version', async () => {
    const recipesService = { findById: jest.fn().mockResolvedValue({ id: 'recipe-1', ownerId: 'user-1', visibility: 'PRIVATE', versions: [recipeVersion()] }) };
    const foodsService = { findDetailById: jest.fn().mockImplementation(async (id: string) => id === 'food-1' ? food('food-1', 'Chicken', '20', '100') : food('food-2', 'Rice', '5', '2')) };
    const policyService = { loadContext: jest.fn().mockResolvedValue({ profile: null, conditionCodes: [], energyGoal: 'maintenance', asOf: new Date(), evidence: {} }), calculateFromContext: jest.fn().mockReturnValue(targetCalculation), getPolicySetFingerprint: jest.fn().mockReturnValue('policy-set-1') };
    const service = new RecipeEvaluationService(recipesService as never, foodsService as never, policyService as never, new FoodEvaluationEngine());

    const result = await service.evaluate('user-1', 'recipe-1', undefined, '2');

    expect(result.recipeVersionId).toBe('recipe-version-1');
    expect(result.portionGrams).toBe('200');
    expect(result.components.map(({ portionGrams }) => portionGrams)).toEqual(['100', '100']);
  });

  it('can evaluate the exact immutable version selected by a resolver', async () => {
    const current = recipeVersion();
    const previous = { ...recipeVersion(), id: 'recipe-version-0', version: 0 };
    const recipesService = { findById: jest.fn().mockResolvedValue({ id: 'recipe-1', ownerId: 'user-1', visibility: 'PRIVATE', versions: [current, previous] }) };
    const foodsService = { findDetailById: jest.fn().mockImplementation(async (id: string) => id === 'food-1' ? food('food-1', 'Chicken', '20', '100') : food('food-2', 'Rice', '5', '2')) };
    const policyService = { loadContext: jest.fn().mockResolvedValue({ profile: null, conditionCodes: [], energyGoal: 'maintenance', asOf: new Date(), evidence: {} }), calculateFromContext: jest.fn().mockReturnValue(targetCalculation), getPolicySetFingerprint: jest.fn().mockReturnValue('policy-set-1') };
    const service = new RecipeEvaluationService(recipesService as never, foodsService as never, policyService as never, new FoodEvaluationEngine());

    const result = await service.evaluate('user-1', 'recipe-1', undefined, '1', 'recipe-version-0');

    expect(result.recipeVersionId).toBe('recipe-version-0');
    expect(result.recipeVersion).toBe(0);
  });
});
