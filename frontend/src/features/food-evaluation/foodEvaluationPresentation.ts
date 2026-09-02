import type { FoodEvaluationContribution } from './types/evaluation.types';

/**
 * Converts evaluator wording into patient-facing copy without changing the
 * underlying contribution, target, score, or evaluation semantics.
 */
export function formatContributionExplanation(contribution: FoodEvaluationContribution): string {
  const nutrient = contribution.nutrient.toLowerCase();
  if (!['potassium', 'phosphorus'].includes(nutrient) || contribution.targetValue != null) {
    return contribution.explanation;
  }

  const unit = contribution.unit ?? 'mg';
  return `This serving contains ${contribution.amount} ${unit} of ${nutrient}. Because a personalized ${nutrient} target has not been configured, ${nutrient} could not be included when calculating this compatibility score.`;
}
