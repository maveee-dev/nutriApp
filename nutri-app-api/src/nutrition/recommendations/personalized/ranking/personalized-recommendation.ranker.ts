import { Decimal } from 'decimal.js';
import type { FoodDetailSource } from '../../../foods/sources/food-detail.source.js';
import type { FoodEvaluationSource } from '../../../evaluation/types/food-evaluation.type.js';
import type { PersonalizedRecommendationBudgetItem, PersonalizedRecommendationGoal } from '../types/personalized-recommendation.type.js';

export interface PersonalizedRankedCandidate {
  readonly food: FoodDetailSource;
  readonly serving: FoodDetailSource['servings'][number];
  readonly evaluation: FoodEvaluationSource;
  readonly budgetImpact: readonly {
    readonly nutrient: string;
    readonly amount: string;
    readonly unit: string;
    readonly target: string | null;
    readonly remainingBefore: string | null;
    readonly remainingAfter: string | null;
    readonly targetConfigured: boolean;
  }[];
  readonly highlights: readonly { readonly nutrient: string; readonly amount: string; readonly unit: string }[];
  readonly whyRecommended: string;
  readonly limitations: readonly string[];
}

export function rankPersonalizedRecommendations(
  candidates: readonly PersonalizedRankedCandidate[],
  goal: PersonalizedRecommendationGoal,
  remainingBudget: Readonly<Record<string, PersonalizedRecommendationBudgetItem>>,
): readonly PersonalizedRankedCandidate[] {
  return [...candidates].sort((left, right) => {
    const goalOrder = compareGoal(left, right, goal);
    if (goalOrder !== 0) return goalOrder;

    const budgetOrder = budgetFitCount(right, remainingBudget) - budgetFitCount(left, remainingBudget);
    if (budgetOrder !== 0) return budgetOrder;

    const statusOrder = evaluationStatusRank(right.evaluation) - evaluationStatusRank(left.evaluation);
    if (statusOrder !== 0) return statusOrder;

    const scoreOrder = right.evaluation.score - left.evaluation.score;
    if (scoreOrder !== 0) return scoreOrder;

    const coverageOrder = right.evaluation.coverage - left.evaluation.coverage;
    if (coverageOrder !== 0) return coverageOrder;

    const displayOrder = (left.food.displayName ?? left.food.name).localeCompare(right.food.displayName ?? right.food.name);
    if (displayOrder !== 0) return displayOrder;
    const canonicalOrder = left.food.name.localeCompare(right.food.name);
    return canonicalOrder !== 0 ? canonicalOrder : left.food.id.localeCompare(right.food.id);
  });
}

function compareGoal(left: PersonalizedRankedCandidate, right: PersonalizedRankedCandidate, goal: PersonalizedRecommendationGoal): number {
  if (goal === 'BALANCED') return 0;
  if (goal === 'HEART_HEALTHY') {
    const saturatedFatOrder = compareNumericContribution(left, right, 'saturated-fat', 'low');
    return saturatedFatOrder !== 0 ? saturatedFatOrder : compareNumericContribution(left, right, 'cholesterol', 'low');
  }

  const nutrient = goal === 'HIGHER_PROTEIN' ? 'protein'
    : goal === 'HIGHER_FIBER' ? 'fiber'
      : goal === 'LOWER_SODIUM' ? 'sodium'
        : goal === 'LOWER_PHOSPHORUS' ? 'phosphorus'
          : goal === 'LOWER_POTASSIUM' ? 'potassium'
            : 'calories';
  const direction = goal.startsWith('LOWER_') ? 'low' : 'high';
  return compareNumericContribution(left, right, nutrient, direction);
}

function compareNumericContribution(left: PersonalizedRankedCandidate, right: PersonalizedRankedCandidate, nutrient: string, direction: 'low' | 'high'): number {
  const leftValue = contributionValue(left.evaluation, nutrient);
  const rightValue = contributionValue(right.evaluation, nutrient);
  if (leftValue == null && rightValue == null) return 0;
  if (leftValue == null) return 1;
  if (rightValue == null) return -1;
  const comparison = leftValue.cmp(rightValue);
  return direction === 'low' ? comparison : -comparison;
}

function contributionValue(evaluation: FoodEvaluationSource, nutrient: string): Decimal | null {
  const contribution = evaluation.contributions.find((item) => normalizeNutrient(item.nutrient) === nutrient);
  if (contribution == null) return null;
  try {
    const value = new Decimal(contribution.amount);
    return value.isFinite() ? value : null;
  } catch {
    return null;
  }
}

function budgetFitCount(candidate: PersonalizedRankedCandidate, remainingBudget: Readonly<Record<string, PersonalizedRecommendationBudgetItem>>): number {
  return candidate.budgetImpact.reduce((count, impact) => {
    const budget = remainingBudget[impact.nutrient];
    if (budget?.target == null || impact.remainingAfter == null) return count;
    try {
      return new Decimal(impact.remainingAfter).gte(0) ? count + 1 : count;
    } catch {
      return count;
    }
  }, 0);
}

function evaluationStatusRank(evaluation: FoodEvaluationSource): number {
  return evaluation.evaluationStatus === 'evaluated' ? 1 : 0;
}

function normalizeNutrient(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (normalized === 'saturated fat') return 'saturated-fat';
  if (normalized === 'added sugar') return 'added-sugar';
  if (normalized === 'carbohydrate' || normalized === 'carbohydrates') return 'carbohydrates';
  return normalized;
}
