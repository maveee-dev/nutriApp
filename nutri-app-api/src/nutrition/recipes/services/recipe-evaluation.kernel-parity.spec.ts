import { Decimal } from 'decimal.js';
import { jest } from '@jest/globals';
import { FoodEvaluationEngine } from '../../evaluation/services/food-evaluation.engine.js';
import type { FoodEvaluationNutrientInput } from '../../evaluation/types/food-evaluation.type.js';
import type { FoodDetailSource } from '../../foods/sources/food-detail.source.js';
import { CHARACTERIZATION_TARGET_CALCULATION } from '../../testing/fixtures/calculation-characterization.fixtures.js';
import { RecipeEvaluationService } from './recipe-evaluation.service.js';

function food(id: string, servingGrams: string, nutrients: readonly { name: string; unit: string; amount: string }[]): FoodDetailSource {
  return {
    id,
    source: 'TEST',
    sourceId: id,
    name: id,
    category: { id: 'category-1', name: 'Test', description: null },
    planningClass: 'MEAL_ELIGIBLE',
    servings: [{ id: `${id}-serving`, name: '1 test serving', grams: servingGrams }],
    nutrients: nutrients.map((item, index) => ({
      nutrient: { id: `${id}-nutrient-${index}`, name: item.name, unit: item.unit, description: null },
      amount: item.amount,
    })),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function legacyProfile(
  foods: readonly FoodDetailSource[],
  components: readonly { foodId: string; quantity: string }[],
  yieldServings: string,
  portionGrams: string,
): FoodEvaluationNutrientInput[] {
  const totals = new Map<string, { name: string; unit: string; amount: Decimal }>();
  for (const component of components) {
    const source = foods.find((item) => item.id === component.foodId);
    if (source == null) throw new Error(`Missing fixture food ${component.foodId}`);
    const grams = new Decimal(source.servings[0]!.grams).mul(component.quantity);
    for (const item of source.nutrients) {
      const key = `${item.nutrient.name.trim().toLowerCase()}|${item.nutrient.unit.trim().toLowerCase()}`;
      const amount = new Decimal(item.amount).mul(grams).div(100).div(yieldServings);
      const existing = totals.get(key);
      totals.set(key, existing == null
        ? { name: item.nutrient.name, unit: item.nutrient.unit, amount }
        : { ...existing, amount: existing.amount.plus(amount) });
    }
  }
  return [...totals.values()].map(({ name, unit, amount }) => ({
    name,
    unit,
    amountPer100Grams: amount.mul(100).div(portionGrams).toString(),
  }));
}

describe('RecipeEvaluationService kernel migration parity', () => {
  it('preserves recipe, aggregate, and component evaluation outputs for fractional servings and aliases', async () => {
    const components = [
      {
        id: 'component-a', foodId: 'food-a', foodName: 'Food A', servingId: 'food-a-serving', servingName: '1 test serving', servingGrams: '80',
        role: 'MAIN_DISH', quantity: '1.25', unit: 'SERVING', displayOrder: 0, notes: null,
      },
      {
        id: 'component-b', foodId: 'food-b', foodName: 'Food B', servingId: 'food-b-serving', servingName: '1 test serving', servingGrams: '30',
        role: 'STAPLE', quantity: '0.5', unit: 'SERVING', displayOrder: 1, notes: null,
      },
    ];
    const version = {
      id: 'recipe-version-1', recipeId: 'recipe-1', version: 1, name: 'Parity Bowl', description: null, cuisine: 'Test', mealTypes: ['LUNCH'],
      yieldServings: '3', sourceType: 'OFFICIAL', sourceName: 'Test', sourceUrl: null, sourceReference: null, sourceVersion: '1',
      approvalStatus: 'APPROVED', approvedAt: new Date('2026-01-01T00:00:00.000Z'), approvedByUserId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'), components,
    };
    const foods = [
      food('food-a', '80', [
        { name: 'Sodium, Na', unit: 'MG', amount: '123.456' },
        { name: 'Protein', unit: 'g', amount: '1.234567' },
        { name: 'Carbohydrates', unit: 'g', amount: '10' },
      ]),
      food('food-b', '30', [
        { name: ' sodium ', unit: 'mg', amount: '77.7' },
        { name: 'Protein', unit: 'g', amount: '4.5' },
        { name: 'Carbohydrates', unit: 'g', amount: '20' },
      ]),
    ];
    const recipesService = {
      findById: jest.fn().mockResolvedValue({ id: 'recipe-1', ownerId: 'user-1', visibility: 'PRIVATE', versions: [version] }),
    };
    const foodsService = {
      findDetailById: jest.fn().mockImplementation(async (id: string) => foods.find((item) => item.id === id)),
    };
    const policyService = {
      loadContext: jest.fn().mockResolvedValue({ profile: null, conditionCodes: [], energyGoal: 'maintenance', asOf: new Date('2026-01-01T00:00:00.000Z'), evidence: {} }),
      calculateFromContext: jest.fn().mockReturnValue(CHARACTERIZATION_TARGET_CALCULATION),
      getPolicySetFingerprint: jest.fn().mockReturnValue('parity-policy-set'),
    };
    const engine = new FoodEvaluationEngine();
    const service = new RecipeEvaluationService(recipesService as never, foodsService as never, policyService as never, engine);

    const result = await service.evaluate('user-1', 'recipe-1');
    const portionGrams = new Decimal('80').mul('1.25').plus(new Decimal('30').mul('0.5')).div('3');
    const expectedAggregate = engine.evaluate({
      portionGrams: portionGrams.toString(),
      nutrients: legacyProfile(foods, components, '3', portionGrams.toString()),
      targets: CHARACTERIZATION_TARGET_CALCULATION.targets,
      targetCalculation: CHARACTERIZATION_TARGET_CALCULATION,
    });

    expect(result.portionGrams).toBe(portionGrams.toString());
    expect(result.evaluation).toEqual(expectedAggregate);
    expect(result.components.map(({ evaluation }) => evaluation)).toEqual([
      engine.evaluate({
        portionGrams: new Decimal('100').div('3').toString(),
        nutrients: foods[0]!.nutrients.map(({ nutrient, amount }) => ({ name: nutrient.name, unit: nutrient.unit, amountPer100Grams: amount })),
        targets: CHARACTERIZATION_TARGET_CALCULATION.targets,
        targetCalculation: CHARACTERIZATION_TARGET_CALCULATION,
      }),
      engine.evaluate({
        portionGrams: new Decimal('15').div('3').toString(),
        nutrients: foods[1]!.nutrients.map(({ nutrient, amount }) => ({ name: nutrient.name, unit: nutrient.unit, amountPer100Grams: amount })),
        targets: CHARACTERIZATION_TARGET_CALCULATION.targets,
        targetCalculation: CHARACTERIZATION_TARGET_CALCULATION,
      }),
    ]);
    expect(result.provenance.recipeFingerprint).toHaveLength(64);
    expect(result.provenance.policySetFingerprint).toBe('parity-policy-set');
  });
});
