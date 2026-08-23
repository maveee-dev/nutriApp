import { FoodEvaluationEngine } from '../services/food-evaluation.engine.js';
import { Decimal } from 'decimal.js';
import {
  FoodEvaluationInput,
  FoodEvaluationNutrientInput,
  FoodEvaluationSource,
} from '../types/food-evaluation.type.js';
import { NutritionTargets, NutritionTargetCalculation } from '../../analysis/types/nutrition-targets.type.js';

export type ValidationExpectation = 'pass' | 'needs-review';

export interface FoodEvaluationValidationCase {
  readonly id: string;
  readonly food: string;
  readonly portionGrams: string;
  readonly nutrients: readonly FoodEvaluationNutrientInput[];
  readonly targets: NutritionTargets;
  readonly deferredPolicies?: NutritionTargetCalculation['deferredPolicies'];
  readonly expected?: {
    readonly compatibility?: ValidationExpectation;
    readonly score?: number;
    readonly coverage?: number;
    readonly userIntuitive?: 'yes' | 'no' | 'unclear';
    readonly explanationSufficient?: 'yes' | 'no' | 'partial';
  };
}

export interface FoodEvaluationValidationResult {
  readonly id: string;
  readonly food: string;
  readonly portionGrams: string;
  readonly score: number;
  readonly coverage: number;
  readonly sodiumAmount: string | null;
  readonly sodiumTarget: string;
  readonly potassiumAmount: string | null;
  readonly potassiumTarget: string | null;
  readonly compatibilityReasons: readonly string[];
  readonly proteinContribution: string | null;
  readonly potassiumContribution: string | null;
  readonly calorieContribution: string | null;
  readonly fiberContribution: string | null;
  readonly carbohydrateContribution: string | null;
  readonly saturatedFatContribution: string | null;
  readonly addedSugarContribution: string | null;
  readonly cholesterolContribution: string | null;
  readonly deferredPolicies: NutritionTargetCalculation['deferredPolicies'];
  readonly expectedCompatibility: ValidationExpectation;
  readonly technicalResult: 'pass' | 'needs-review';
  readonly userIntuitive: 'yes' | 'no' | 'unclear';
  readonly explanationSufficient: 'yes' | 'no' | 'partial';
  readonly reviewCategory: 'none' | 'scoring-model' | 'nutrient-identification' | 'missing-policy' | 'portion-expectation';
  readonly reviewNotes: readonly string[];
}

export class FoodEvaluationValidation {
  constructor(private readonly engine = new FoodEvaluationEngine()) {}

  evaluate(testCase: FoodEvaluationValidationCase): FoodEvaluationValidationResult {
    const calculation: NutritionTargetCalculation = {
      targets: testCase.targets,
      adjustments: [],
      deferredPolicies: testCase.deferredPolicies ?? [],
    };
    const input: FoodEvaluationInput = {
      nutrients: testCase.nutrients,
      portionGrams: testCase.portionGrams,
      targets: testCase.targets,
      targetCalculation: calculation,
    };
    const actual = this.engine.evaluate(input);
    const sodium = this.totalFor(testCase.nutrients, testCase.portionGrams, 'sodium', 'mg');
    const potassium = this.totalFor(testCase.nutrients, testCase.portionGrams, 'potassium', 'mg');
    const potassiumTarget = testCase.targets.potassiumMilligrams;
    const expectedCompatibility = sodium == null || (potassiumTarget != null && potassium == null)
      ? 'needs-review'
      : sodium.gt(testCase.targets.sodiumMilligrams) || (potassiumTarget != null && potassium!.gt(potassiumTarget))
        ? 'needs-review'
        : 'pass';
    const notes: string[] = [];
    if (sodium == null) notes.push('Sodium was not identified in the supported V1 nutrient data.');
    if (potassiumTarget != null && potassium == null) notes.push('Potassium was required by the supplied policy but was not identified in the food data.');
    if (testCase.expected?.score !== undefined && testCase.expected.score !== actual.score) {
      notes.push(`Expected score ${testCase.expected.score}, received ${actual.score}.`);
    }
    if (testCase.expected?.coverage !== undefined && testCase.expected.coverage !== actual.coverage) {
      notes.push(`Expected coverage ${testCase.expected.coverage}, received ${actual.coverage}.`);
    }
    if (testCase.expected?.compatibility !== undefined && testCase.expected.compatibility !== expectedCompatibility) {
      notes.push(`Expected compatibility ${testCase.expected.compatibility}, received ${expectedCompatibility}.`);
    }
    const technicalResult = notes.length === 0 ? 'pass' : 'needs-review';
    const reviewCategory = notes.length === 0
      ? 'none'
      : sodium == null ? 'nutrient-identification'
      : testCase.expected?.score !== undefined && testCase.expected.score !== actual.score ? 'scoring-model'
      : 'portion-expectation';
    return {
      id: testCase.id,
      food: testCase.food,
      portionGrams: testCase.portionGrams,
      score: actual.score,
      coverage: actual.coverage,
      sodiumAmount: sodium?.toString() ?? null,
      sodiumTarget: testCase.targets.sodiumMilligrams,
      potassiumAmount: potassium?.toString() ?? null,
      potassiumTarget: potassiumTarget ?? null,
      compatibilityReasons: actual.reasons.map((reason) => reason.explanation),
      proteinContribution: actual.contributions.find((contribution) => contribution.nutrient === 'protein')?.explanation ?? null,
      potassiumContribution: actual.contributions.find((contribution) => contribution.nutrient === 'potassium')?.explanation ?? null,
      calorieContribution: actual.contributions.find((contribution) => contribution.nutrient === 'calories')?.explanation ?? null,
      fiberContribution: actual.contributions.find((contribution) => contribution.nutrient === 'fiber')?.explanation ?? null,
      carbohydrateContribution: actual.contributions.find((contribution) => contribution.nutrient === 'carbohydrates')?.explanation ?? null,
      saturatedFatContribution: actual.contributions.find((contribution) => contribution.nutrient === 'saturated-fat')?.explanation ?? null,
      addedSugarContribution: actual.contributions.find((contribution) => contribution.nutrient === 'added-sugar')?.explanation ?? null,
      cholesterolContribution: actual.contributions.find((contribution) => contribution.nutrient === 'cholesterol')?.explanation ?? null,
      deferredPolicies: actual.deferredPolicies,
      expectedCompatibility,
      technicalResult,
      userIntuitive: testCase.expected?.userIntuitive ?? 'unclear',
      explanationSufficient: testCase.expected?.explanationSufficient ?? 'partial',
      reviewCategory,
      reviewNotes: notes,
    };
  }

  private totalFor(
    nutrients: readonly FoodEvaluationNutrientInput[],
    portionGrams: string,
    nutrientName: string,
    unit: string,
  ) {
    const matching = nutrients
      .filter((nutrient) => this.canonicalName(nutrient.name) === nutrientName && nutrient.unit.trim().toLowerCase() === unit);
    if (matching.length === 0) return null;
    return matching
      .reduce(
        (total, nutrient) => total.plus(new Decimal(nutrient.amountPer100Grams).mul(portionGrams).div(100)),
        new Decimal(0),
      );
  }

  private canonicalName(name: string): string {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normalized === 'sodium' || normalized.startsWith('sodium,')) return 'sodium';
    if (normalized === 'protein' || normalized.startsWith('protein,')) return 'protein';
    return normalized;
  }
}
