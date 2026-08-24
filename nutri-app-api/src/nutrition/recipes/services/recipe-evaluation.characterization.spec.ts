import { jest } from '@jest/globals';
import { FoodEvaluationEngine } from '../../evaluation/services/food-evaluation.engine.js';
import {
  CHARACTERIZATION_TARGET_CALCULATION,
  characterizationFood,
  characterizationRecipeVersion,
} from '../../testing/fixtures/calculation-characterization.fixtures.js';
import { RecipeEvaluationService } from './recipe-evaluation.service.js';

describe('RecipeEvaluationService characterization', () => {
  it('captures serving conversion, component scaling, recipe yield, and aggregate evaluation', async () => {
    const version = characterizationRecipeVersion();
    const recipesService = {
      findById: jest.fn().mockResolvedValue({
        id: 'characterization-recipe',
        ownerId: null,
        visibility: 'PUBLIC',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        versions: [version],
      }),
    };
    const foodsService = {
      findDetailById: jest.fn().mockImplementation(async (id: string) => characterizationFood(id, id, undefined, id === 'characterization-food-b' ? '50' : '100')),
    };
    const policyService = {
      loadContext: jest.fn(),
      calculateFromContext: jest.fn().mockReturnValue(CHARACTERIZATION_TARGET_CALCULATION),
      getPolicySetFingerprint: jest.fn().mockReturnValue('characterization-policy-set'),
    };
    const service = new RecipeEvaluationService(
      recipesService as never,
      foodsService as never,
      policyService as never,
      new FoodEvaluationEngine(),
    );

    const result = await service.evaluate('user-1', 'characterization-recipe');

    expect(result.portionGrams).toBe('100');
    expect(result.components.map(({ portionGrams }) => portionGrams)).toEqual(['50', '50']);
    expect(result.evaluation.reasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ nutrient: 'sodium', measuredValue: '120' }),
      expect.objectContaining({ nutrient: 'potassium', measuredValue: '250' }),
      expect.objectContaining({ nutrient: 'phosphorus', measuredValue: '100' }),
    ]));
    expect(result.evaluation.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ nutrient: 'protein', amount: '10' }),
      expect.objectContaining({ nutrient: 'carbohydrates', amount: '20' }),
      expect.objectContaining({ nutrient: 'calories', amount: '100' }),
    ]));
    expect(result.provenance.canonicalFoods).toHaveLength(2);
    expect(result.provenance.policySetFingerprint).toBe('characterization-policy-set');
  });
});
