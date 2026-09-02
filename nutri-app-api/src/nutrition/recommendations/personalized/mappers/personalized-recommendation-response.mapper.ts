import type { PersonalizedRecommendationSource } from '../types/personalized-recommendation.type.js';
import type { PersonalizedRecommendationResponseDto } from '../dto/personalized-recommendation-response.dto.js';

export class PersonalizedRecommendationResponseMapper {
  static toDto(source: PersonalizedRecommendationSource): PersonalizedRecommendationResponseDto {
    return {
      date: source.date,
      goal: source.goal,
      mealType: source.mealType,
      recommendations: source.recommendations.map((recommendation) => ({
        foodId: recommendation.foodId,
        canonicalName: recommendation.canonicalName,
        displayName: recommendation.displayName,
        variantLabel: recommendation.variantLabel,
        category: recommendation.category,
        servingId: recommendation.servingId,
        servingName: recommendation.servingName,
        servingGrams: recommendation.servingGrams,
        quantity: recommendation.quantity,
        compatibilityScore: recommendation.compatibilityScore,
        coverage: recommendation.coverage,
        evaluationStatus: recommendation.evaluationStatus,
        remainingBudgetImpact: recommendation.remainingBudgetImpact.map((impact) => ({ ...impact })),
        nutritionHighlights: recommendation.nutritionHighlights.map((highlight) => ({ ...highlight })),
        whyRecommended: recommendation.whyRecommended,
        limitations: [...recommendation.limitations],
        nutritionInsights: recommendation.nutritionInsights.map((insight) => ({ ...insight, evidence: { ...insight.evidence } })),
        evaluation: {
          score: recommendation.evaluation.score,
          coverage: recommendation.evaluation.coverage,
          evaluationStatus: recommendation.evaluation.evaluationStatus ?? 'evaluated',
          reasons: recommendation.evaluation.reasons.map((reason) => ({ ...reason })),
          contributions: recommendation.evaluation.contributions.map((contribution) => ({ ...contribution })),
          deferredPolicies: recommendation.evaluation.deferredPolicies.map((policy) => ({ ...policy })),
        },
      })),
      ...(source.recipeRecommendations == null ? {} : {
        recipeRecommendations: source.recipeRecommendations.map((recommendation) => ({
          recipeId: recommendation.recipeId,
          recipeVersionId: recommendation.recipeVersionId,
          name: recommendation.name,
          servingName: recommendation.servingName,
          servingGrams: recommendation.servingGrams,
          quantity: recommendation.quantity,
          compatibilityScore: recommendation.compatibilityScore,
          coverage: recommendation.coverage,
          evaluationStatus: recommendation.evaluationStatus,
          remainingBudgetImpact: recommendation.remainingBudgetImpact.map((impact) => ({ ...impact })),
          nutritionHighlights: recommendation.nutritionHighlights.map((highlight) => ({ ...highlight })),
          whyRecommended: recommendation.whyRecommended,
          limitations: [...recommendation.limitations],
          nutritionInsights: recommendation.nutritionInsights.map((insight) => ({ ...insight, evidence: { ...insight.evidence } })),
          evaluation: {
            score: recommendation.evaluation.score,
            coverage: recommendation.evaluation.coverage,
            evaluationStatus: recommendation.evaluation.evaluationStatus ?? 'evaluated',
            reasons: recommendation.evaluation.reasons.map((reason) => ({ ...reason })),
            contributions: recommendation.evaluation.contributions.map((contribution) => ({ ...contribution })),
            deferredPolicies: recommendation.evaluation.deferredPolicies.map((policy) => ({ ...policy })),
          },
        })),
      }),
      remainingBudget: Object.fromEntries(Object.entries(source.remainingBudget).map(([key, value]) => [key, { ...value }])),
      laboratoryConsiderations: [...source.laboratoryConsiderations],
      profileConsiderations: [...source.profileConsiderations],
      limitations: [...source.limitations],
      provenance: { ...source.provenance, activeTargetIds: [...source.provenance.activeTargetIds] },
    };
  }
}
