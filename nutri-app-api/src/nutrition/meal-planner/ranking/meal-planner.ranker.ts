import { Decimal } from 'decimal.js';
import type { FoodDetailSource } from '../../foods/sources/food-detail.source.js';
import type { FoodEvaluationSource } from '../../evaluation/types/food-evaluation.type.js';
import type { MealPlannerFocus, MealPlannerRemainingBudget } from '../types/meal-planner.type.js';

export interface MealPlannerRankedCandidate {
  readonly food: FoodDetailSource;
  readonly serving: FoodDetailSource['servings'][number];
  readonly evaluation: FoodEvaluationSource;
}

const NUTRIENT_FOR_FOCUS: Readonly<Record<Exclude<MealPlannerFocus, 'BALANCED'>, string>> = {
  LOW_SODIUM: 'sodium',
  HIGH_PROTEIN: 'protein',
  HIGH_FIBER: 'fiber',
  CALORIE_BUDGET: 'calories',
};

/**
 * Orders already-evaluated candidates. This is selection policy only: it never
 * recomputes compatibility or changes the Food Evaluation result.
 */
export function rankMealPlannerCandidates(
  candidates: readonly MealPlannerRankedCandidate[],
  focus: MealPlannerFocus,
  remainingBudget: MealPlannerRemainingBudget,
): readonly MealPlannerRankedCandidate[] {
  return [...candidates].sort((left, right) => {
    const focusValue = compareFocusValue(left, right, focus);
    if (focusValue !== 0) return focusValue;

    const budgetFit = compareBudgetFit(left, right, remainingBudget);
    if (budgetFit !== 0) return budgetFit;

    const score = right.evaluation.score - left.evaluation.score;
    if (score !== 0) return score;

    const coverage = right.evaluation.coverage - left.evaluation.coverage;
    if (coverage !== 0) return coverage;

    const category = left.food.category.name.localeCompare(right.food.category.name);
    if (category !== 0) return category;
    const displayName = (left.food.displayName ?? left.food.name).localeCompare(right.food.displayName ?? right.food.name);
    if (displayName !== 0) return displayName;
    const canonicalName = left.food.name.localeCompare(right.food.name);
    if (canonicalName !== 0) return canonicalName;
    return left.food.id.localeCompare(right.food.id);
  });
}

export function candidateContribution(candidate: MealPlannerRankedCandidate, nutrient: string): { amount: string; unit: string } | null {
  const contribution = candidate.evaluation.contributions.find((item) => normalizeNutrient(item.nutrient) === nutrient);
  if (contribution == null) return null;
  return { amount: contribution.amount, unit: contribution.unit ?? unitFor(nutrient) };
}

export function candidateFitsCalorieBudget(candidate: MealPlannerRankedCandidate, caloriesRemaining: string | undefined): boolean {
  if (caloriesRemaining == null) return true;
  const calories = candidateContribution(candidate, 'calories');
  return calories != null && new Decimal(calories.amount).lte(new Decimal(caloriesRemaining));
}

function compareBudgetFit(
  left: MealPlannerRankedCandidate,
  right: MealPlannerRankedCandidate,
  remainingBudget: MealPlannerRemainingBudget,
): number {
  const leftFit = budgetFitCount(left, remainingBudget);
  const rightFit = budgetFitCount(right, remainingBudget);
  return rightFit - leftFit;
}

function budgetFitCount(candidate: MealPlannerRankedCandidate, remainingBudget: MealPlannerRemainingBudget): number {
  let fit = 0;
  for (const [nutrient, budget] of Object.entries(remainingBudget)) {
    if (budget.remaining == null || budget.target == null) continue;
    const contribution = candidateContribution(candidate, nutrient);
    if (contribution == null) continue;
    if (budget.status === 'within-target' || budget.status === 'below-target') {
      if (new Decimal(contribution.amount).lte(new Decimal(budget.remaining))) fit += 1;
    } else if (budget.status === 'target-met' || budget.status === 'over-limit') {
      if (new Decimal(contribution.amount).isZero()) fit += 1;
    }
  }
  return fit;
}

function compareFocusValue(left: MealPlannerRankedCandidate, right: MealPlannerRankedCandidate, focus: MealPlannerFocus): number {
  if (focus === 'BALANCED') return 0;
  const nutrient = NUTRIENT_FOR_FOCUS[focus];
  const leftContribution = candidateContribution(left, nutrient);
  const rightContribution = candidateContribution(right, nutrient);
  if (leftContribution == null && rightContribution == null) return 0;
  if (leftContribution == null) return 1;
  if (rightContribution == null) return -1;
  const leftValue = new Decimal(leftContribution.amount);
  const rightValue = new Decimal(rightContribution.amount);
  if (focus === 'LOW_SODIUM' || focus === 'CALORIE_BUDGET') return leftValue.cmp(rightValue);
  return rightValue.cmp(leftValue);
}

function normalizeNutrient(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (normalized === 'saturated fat') return 'saturatedFat';
  if (normalized === 'added sugar') return 'addedSugar';
  if (normalized === 'carbohydrate' || normalized === 'carbohydrates') return 'carbohydrates';
  return normalized;
}

function unitFor(nutrient: string): string {
  return nutrient === 'protein' || nutrient === 'fiber' ? 'g' : nutrient === 'calories' ? 'kcal' : 'mg';
}
