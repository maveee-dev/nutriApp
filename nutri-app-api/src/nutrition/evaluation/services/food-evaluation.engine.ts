import { Decimal } from 'decimal.js';
import { CanonicalCalculationKernel } from '../../calculation/index.js';
import { NutritionTotal } from '../../analysis/types/nutrition-total.type.js';
import {
  FoodEvaluationContribution,
  FoodEvaluationInput,
  FoodEvaluationReason,
  FoodEvaluationSource,
} from '../types/food-evaluation.type.js';

const SODIUM_WEIGHT = 40;
const POTASSIUM_WEIGHT = 30;
const PHOSPHORUS_WEIGHT = 30;
const SATURATED_FAT_WEIGHT = 20;
const ADDED_SUGAR_WEIGHT = 15;
const CHOLESTEROL_WEIGHT = 15;
const BASELINE_TOTAL_WEIGHT = SODIUM_WEIGHT;

interface ConstraintEvaluation {
  readonly weight: number;
  readonly quality: number;
  readonly reasons: readonly FoodEvaluationReason[];
}

export class FoodEvaluationEngine {
  private readonly calculationKernel = new CanonicalCalculationKernel();

  evaluate(input: FoodEvaluationInput): FoodEvaluationSource {
    return this.evaluateWithKernel(input);
  }

  /**
   * Kernel-backed implementation shared by the standalone Food Evaluation
   * endpoint and the compatibility entrypoint above.
   */
  evaluateWithKernel(input: FoodEvaluationInput): FoodEvaluationSource {
    const calculation = this.calculationKernel.calculateNutrients({
      servingGrams: input.portionGrams,
      nutrients: input.nutrients.map((nutrient) => ({
        nutrientKey: this.canonicalNutrientName(nutrient.name),
        name: this.canonicalNutrientName(nutrient.name),
        unit: nutrient.unit,
        amountPer100Grams: nutrient.amountPer100Grams,
      })),
    });
    const totals = this.calculationKernel.aggregateContributions(calculation.contributions).contributions.map((contribution) => ({
      name: contribution.nutrientKey,
      unit: contribution.unit.trim().toLowerCase(),
      amount: contribution.amount,
    }));
    return this.evaluateTotals(input, totals);
  }

  private evaluateTotals(input: FoodEvaluationInput, totals: readonly NutritionTotal[]): FoodEvaluationSource {
    const sodiumEvaluation = this.evaluateSodium(totals, input.targets.sodiumMilligrams);
    const protein = this.evaluateProtein(
      totals,
      input.targets.proteinGrams,
      input.currentDailyTotals,
    );
    const potassiumEvaluation = this.evaluatePotassium(totals, input.targets.potassiumMilligrams);
    const phosphorusEvaluation = this.evaluatePhosphorus(totals, input.targets.phosphorusMilligrams);
    const calories = this.evaluateCalories(totals, input.targets.caloriesKcal);
    const fiber = this.evaluateFiber(totals, input.targets.fiberGrams);
    const carbohydrates = this.evaluateCarbohydrates(totals, input.targets.carbohydrateGrams);
    const saturatedFat = this.evaluateSaturatedFat(totals, input.targets.saturatedFatGrams);
    const addedSugar = this.evaluateAddedSugar(totals, input.targets.addedSugarGrams);
    const cholesterol = this.evaluateCholesterol(totals, input.targets.cholesterolMilligrams);
    const upperLimitEvaluations = [
      this.evaluateUpperLimit(totals, 'saturated-fat', 'saturated-fat', 'g', input.targets.saturatedFatGrams, SATURATED_FAT_WEIGHT),
      this.evaluateUpperLimit(totals, 'added-sugar', 'added-sugar', 'g', input.targets.addedSugarGrams, ADDED_SUGAR_WEIGHT),
      this.evaluateUpperLimit(totals, 'cholesterol', 'cholesterol', 'mg', input.targets.cholesterolMilligrams, CHOLESTEROL_WEIGHT),
    ].filter((evaluation): evaluation is ConstraintEvaluation => evaluation !== null);
    const constraints = [
      sodiumEvaluation,
      potassiumEvaluation?.constraint ?? null,
      phosphorusEvaluation?.constraint ?? null,
      ...upperLimitEvaluations,
    ].filter((evaluation): evaluation is ConstraintEvaluation => evaluation !== null);
    const evaluatedWeight = constraints.reduce((sum, evaluation) => sum + evaluation.weight, 0);
    const weightedQuality = constraints.reduce(
      (sum, evaluation) => sum + evaluation.quality * evaluation.weight,
      0,
    );

    return {
      score: evaluatedWeight === 0 ? 0 : Math.round((weightedQuality / evaluatedWeight) * 100),
      evaluationStatus: evaluatedWeight === 0 ? 'insufficient-evidence' : 'evaluated',
      coverage: Math.round((this.evaluatedWeight(totals, input.targets) / this.totalWeight(input.targets)) * 10000) / 100,
      reasons: constraints.flatMap((evaluation) => evaluation.reasons),
      contributions: [
        protein,
        potassiumEvaluation?.contribution ?? null,
        phosphorusEvaluation?.contribution ?? null,
        calories,
        fiber,
        carbohydrates,
        saturatedFat,
        addedSugar,
        cholesterol,
      ].filter((contribution): contribution is FoodEvaluationContribution => contribution !== null),
      deferredPolicies: input.targetCalculation.deferredPolicies,
    };
  }

  private evaluateCalories(
    totals: readonly NutritionTotal[],
    targetValue?: string | null,
  ): FoodEvaluationContribution | null {
    const calories = this.findTotal(totals, 'calories', 'kcal');
    if (!calories) return null;
    return {
      nutrient: 'calories',
      unit: 'kcal',
      amount: calories.amount,
      targetValue: targetValue ?? null,
      currentDailyValue: null,
      explanation: targetValue == null ? `This portion provides ${calories.amount} kcal. A personalized daily energy target is not currently available.` : `This portion provides ${calories.amount} kcal toward the applicable daily energy target of ${targetValue} kcal.`,
    };
  }

  private evaluateFiber(
    totals: readonly NutritionTotal[],
    targetValue?: string | null,
  ): FoodEvaluationContribution | null {
    const fiber = this.findTotal(totals, 'fiber', 'g');
    if (!fiber) return null;
    return {
      nutrient: 'fiber',
      unit: 'g',
      amount: fiber.amount,
      targetValue: targetValue ?? null,
      currentDailyValue: null,
      explanation: targetValue == null ? `This portion provides ${fiber.amount} g of dietary fiber. A personalized daily fiber target is not currently available.` : `This portion provides ${fiber.amount} g of dietary fiber toward the applicable daily target of ${targetValue} g.`,
    };
  }

  private evaluateCarbohydrates(
    totals: readonly NutritionTotal[],
    targetValue: string | null | undefined,
  ): FoodEvaluationContribution | null {
    const carbohydrates = this.findTotal(totals, 'carbohydrates', 'g');
    if (!carbohydrates) return null;
    if (targetValue != null) {
      return {
        nutrient: 'carbohydrates',
        unit: 'g',
        amount: carbohydrates.amount,
        targetValue,
        currentDailyValue: null,
        explanation: `This portion provides ${carbohydrates.amount} g of total carbohydrates toward the approved daily target of ${targetValue} g.`,
      };
    }
    return {
      nutrient: 'carbohydrates',
      unit: 'g',
      amount: carbohydrates.amount,
      targetValue: null,
      currentDailyValue: null,
      explanation: `This portion provides ${carbohydrates.amount} g of total carbohydrates. A personalized daily carbohydrate target is not currently available.`,
    };
  }

  private evaluateSaturatedFat(
    totals: readonly NutritionTotal[],
    targetValue?: string | null,
  ): FoodEvaluationContribution | null {
    const saturatedFat = this.findTotal(totals, 'saturated-fat', 'g');
    if (!saturatedFat) return null;
    return {
      nutrient: 'saturated-fat',
      unit: 'g',
      amount: saturatedFat.amount,
      targetValue: targetValue ?? null,
      currentDailyValue: null,
      explanation: targetValue == null ? `This portion provides ${saturatedFat.amount} g of saturated fat. An approved personalized saturated-fat target is not currently available.` : `This portion provides ${saturatedFat.amount} g of saturated fat toward the applicable daily upper limit of ${targetValue} g.`,
    };
  }

  private evaluateAddedSugar(
    totals: readonly NutritionTotal[],
    targetValue?: string | null,
  ): FoodEvaluationContribution | null {
    const addedSugar = this.findTotal(totals, 'added-sugar', 'g');
    if (!addedSugar) return null;
    return {
      nutrient: 'added-sugar',
      unit: 'g',
      amount: addedSugar.amount,
      targetValue: targetValue ?? null,
      currentDailyValue: null,
      explanation: targetValue == null ? `This portion provides ${addedSugar.amount} g of added sugar. An approved personalized added-sugar target is not currently available.` : `This portion provides ${addedSugar.amount} g of added sugar toward the applicable daily upper limit of ${targetValue} g.`,
    };
  }

  private evaluateCholesterol(
    totals: readonly NutritionTotal[],
    targetValue?: string | null,
  ): FoodEvaluationContribution | null {
    const cholesterol = this.findTotal(totals, 'cholesterol', 'mg');
    if (!cholesterol) return null;
    return {
      nutrient: 'cholesterol',
      unit: 'mg',
      amount: cholesterol.amount,
      targetValue: targetValue ?? null,
      currentDailyValue: null,
      explanation: targetValue == null ? `This portion provides ${cholesterol.amount} mg of cholesterol. An approved personalized cholesterol target is not currently available.` : `This portion provides ${cholesterol.amount} mg of cholesterol toward the applicable daily upper limit of ${targetValue} mg.`,
    };
  }

  private evaluateUpperLimit(
    totals: readonly NutritionTotal[],
    nutrient: string,
    reasonNutrient: string,
    unit: string,
    targetValue: string | null | undefined,
    weight: number,
  ): ConstraintEvaluation | null {
    if (targetValue == null) return null;
    const total = this.findTotal(totals, nutrient, unit);
    if (total == null) return null;
    const measured = new Decimal(total.amount);
    const target = new Decimal(targetValue);
    const above = measured.gt(target);
    const quality = target.isZero() ? 0 : Math.max(0, Math.min(1, new Decimal(1).minus(measured.div(target)).toNumber()));
    return {
      weight,
      quality,
      reasons: [{
        code: above ? `${reasonNutrient}-above-target` : `${reasonNutrient}-contribution`,
        direction: above ? 'negative' : 'neutral',
        nutrient: reasonNutrient,
        measuredValue: measured.toString(),
        targetValue: target.toString(),
        explanation: above
          ? `This portion provides ${measured.toString()} ${unit} of ${reasonNutrient}, above the applicable daily upper limit of ${target.toString()} ${unit}.`
          : `This portion provides ${measured.toString()} ${unit} of ${reasonNutrient} against the applicable daily upper limit of ${target.toString()} ${unit}.`,
      }],
    };
  }

  private evaluatePotassium(
    totals: readonly NutritionTotal[],
    targetValue: string | null | undefined,
  ): { readonly constraint: ConstraintEvaluation | null; readonly contribution: FoodEvaluationContribution | null } | null {
    const potassium = this.findTotal(totals, 'potassium', 'mg');
    if (!potassium) return null;
    const measured = new Decimal(potassium.amount);
    if (targetValue == null) {
      return {
        constraint: null,
        contribution: {
          nutrient: 'potassium',
          unit: 'mg',
          amount: measured.toString(),
          targetValue: null,
          currentDailyValue: null,
          explanation: `This portion provides ${measured.toString()} mg of potassium. No applicable potassium policy is currently available.`,
        },
      };
    }
    const target = new Decimal(targetValue);
    const quality = target.isZero()
      ? 0
      : Math.max(0, Math.min(1, new Decimal(1).minus(measured.div(target)).toNumber()));
    return {
      contribution: {
        nutrient: 'potassium',
        unit: 'mg',
        amount: measured.toString(),
        targetValue: target.toString(),
        currentDailyValue: null,
        explanation: `This portion provides ${measured.toString()} mg of potassium toward the applicable daily upper limit of ${target.toString()} mg.`,
      },
      constraint: {
        weight: POTASSIUM_WEIGHT,
        quality,
        reasons: [{
          code: measured.gt(target) ? 'potassium-above-target' : 'potassium-contribution',
          direction: measured.gt(target) ? 'negative' : 'neutral',
          nutrient: 'potassium',
          measuredValue: measured.toString(),
          targetValue: target.toString(),
          explanation: measured.gt(target)
            ? `This portion provides ${measured.toString()} mg of potassium, above the current daily limit of ${target.toString()} mg.`
            : `This portion provides ${measured.toString()} mg of potassium against the current daily limit of ${target.toString()} mg.`,
        }],
      },
    };
  }

  private evaluatePhosphorus(
    totals: readonly NutritionTotal[],
    targetValue: string | null | undefined,
  ): { readonly constraint: ConstraintEvaluation | null; readonly contribution: FoodEvaluationContribution | null } | null {
    const phosphorus = this.findTotal(totals, 'phosphorus', 'mg');
    if (!phosphorus) return null;
    const measured = new Decimal(phosphorus.amount);
    if (targetValue == null) {
      return {
        constraint: null,
        contribution: {
          nutrient: 'phosphorus',
          unit: 'mg',
          amount: measured.toString(),
          targetValue: null,
          currentDailyValue: null,
          explanation: `This portion provides ${measured.toString()} mg of phosphorus. No applicable individualized phosphorus policy is currently available.`,
        },
      };
    }
    const target = new Decimal(targetValue);
    const quality = target.isZero()
      ? 0
      : Math.max(0, Math.min(1, new Decimal(1).minus(measured.div(target)).toNumber()));
    return {
      contribution: {
        nutrient: 'phosphorus',
        unit: 'mg',
        amount: measured.toString(),
        targetValue: target.toString(),
        currentDailyValue: null,
        explanation: `This portion provides ${measured.toString()} mg of phosphorus toward the applicable daily upper limit of ${target.toString()} mg.`,
      },
      constraint: {
        weight: PHOSPHORUS_WEIGHT,
        quality,
        reasons: [{
          code: measured.gt(target) ? 'phosphorus-above-target' : 'phosphorus-contribution',
          direction: measured.gt(target) ? 'negative' : 'neutral',
          nutrient: 'phosphorus',
          measuredValue: measured.toString(),
          targetValue: target.toString(),
          explanation: measured.gt(target)
            ? `This portion provides ${measured.toString()} mg of phosphorus, above the applicable daily upper limit of ${target.toString()} mg.`
            : `This portion provides ${measured.toString()} mg of phosphorus against the applicable daily upper limit of ${target.toString()} mg.`,
        }],
      },
    };
  }

  private evaluateSodium(
    totals: readonly NutritionTotal[],
    targetValue: string,
  ): ConstraintEvaluation | null {
    const sodium = this.findTotal(totals, 'sodium', 'mg');
    if (!sodium) return null;
    const measured = new Decimal(sodium.amount);
    const target = new Decimal(targetValue);
    const quality = target.isZero()
      ? 0
      : Math.max(0, Math.min(1, new Decimal(1).minus(measured.div(target)).toNumber()));
    return {
      weight: SODIUM_WEIGHT,
      quality,
      reasons: [{
        code: measured.gt(target) ? 'sodium-above-target' : 'sodium-contribution',
        direction: measured.gt(target) ? 'negative' : 'neutral',
        nutrient: 'sodium',
        measuredValue: measured.toString(),
        targetValue: target.toString(),
        explanation: measured.gt(target)
          ? `This portion provides ${measured.toString()} mg of sodium, above the current daily limit of ${target.toString()} mg. This negatively affects compatibility because it exceeds the applicable sodium limit.`
          : `This portion provides ${measured.toString()} mg of sodium against the current daily limit of ${target.toString()} mg. This supports compatibility because it remains within the applicable sodium limit.`,
      }],
    };
  }

  private evaluateProtein(
    totals: readonly NutritionTotal[],
    targetValue: string | null,
    currentDailyTotals: readonly NutritionTotal[] | undefined,
  ): FoodEvaluationContribution | null {
    const protein = this.findTotal(totals, 'protein', 'g');
    if (!protein) return null;
    const current = currentDailyTotals == null
      ? null
      : this.findTotal(currentDailyTotals, 'protein', 'g');
    const currentValue = current ? new Decimal(current.amount) : null;
    const target = targetValue == null ? null : new Decimal(targetValue);
    const explanation = target == null
      ? `This portion provides ${protein.amount} g of protein. A personalized daily protein target is unavailable.`
      : currentValue != null && currentValue.gte(target)
        ? `This portion provides ${protein.amount} g of additional protein. Today's protein target of ${target.toString()} g has already been met.`
        : `This portion provides ${protein.amount} g of protein toward the current daily target of ${target.toString()} g.`;
    return {
      nutrient: 'protein',
      unit: 'g',
      amount: protein.amount,
      targetValue: target?.toString() ?? null,
      currentDailyValue: currentValue?.toString() ?? null,
      explanation,
    };
  }

  private evaluatedWeight(totals: readonly NutritionTotal[], targets: FoodEvaluationInput['targets']): number {
    let weight = this.findTotal(totals, 'sodium', 'mg') ? SODIUM_WEIGHT : 0;
    if (targets.potassiumMilligrams != null && this.findTotal(totals, 'potassium', 'mg')) weight += POTASSIUM_WEIGHT;
    if (targets.phosphorusMilligrams != null && this.findTotal(totals, 'phosphorus', 'mg')) weight += PHOSPHORUS_WEIGHT;
    if (targets.saturatedFatGrams != null && this.findTotal(totals, 'saturated-fat', 'g')) weight += SATURATED_FAT_WEIGHT;
    if (targets.addedSugarGrams != null && this.findTotal(totals, 'added-sugar', 'g')) weight += ADDED_SUGAR_WEIGHT;
    if (targets.cholesterolMilligrams != null && this.findTotal(totals, 'cholesterol', 'mg')) weight += CHOLESTEROL_WEIGHT;
    return weight;
  }

  private totalWeight(targets: FoodEvaluationInput['targets']): number {
    return BASELINE_TOTAL_WEIGHT
      + (targets.potassiumMilligrams != null ? POTASSIUM_WEIGHT : 0)
      + (targets.phosphorusMilligrams != null ? PHOSPHORUS_WEIGHT : 0)
      + (targets.saturatedFatGrams != null ? SATURATED_FAT_WEIGHT : 0)
      + (targets.addedSugarGrams != null ? ADDED_SUGAR_WEIGHT : 0)
      + (targets.cholesterolMilligrams != null ? CHOLESTEROL_WEIGHT : 0);
  }

  private findTotal(totals: readonly NutritionTotal[], name: string, unit: string): NutritionTotal | undefined {
    return totals.find((total) => this.canonicalNutrientName(total.name) === name && total.unit.trim().toLowerCase() === unit);
  }

  private canonicalNutrientName(name: string): string {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normalized === 'protein' || normalized.startsWith('protein,')) return 'protein';
    if (normalized === 'sodium' || normalized.startsWith('sodium,')) return 'sodium';
    if (normalized === 'potassium' || normalized.startsWith('potassium,')) return 'potassium';
    if (normalized === 'phosphorus' || normalized.startsWith('phosphorus,')) return 'phosphorus';
    if (normalized === 'calories' || normalized === 'energy') return 'calories';
    if (normalized === 'fiber' || normalized.startsWith('fiber,') || normalized === 'dietary fiber') return 'fiber';
    if (
      normalized === 'carbohydrates' ||
      normalized === 'carbohydrate' ||
      normalized.startsWith('carbohydrate,')
    ) return 'carbohydrates';
    if (
      normalized === 'saturated fat' ||
      normalized === 'saturated-fat' ||
      normalized.startsWith('fatty acids, total saturated')
    ) return 'saturated-fat';
    if (
      normalized === 'added sugar' ||
      normalized === 'added-sugar' ||
      normalized.startsWith('sugars, added')
    ) return 'added-sugar';
    if (normalized === 'cholesterol') return 'cholesterol';
    return normalized;
  }
}
