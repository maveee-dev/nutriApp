import type { RecipeEvaluationSource } from '../../types/recipe-evaluation.source.js';
import { RecipeEvaluationResponseDto } from '../../dto/response/recipe-evaluation-response.dto.js';

export class RecipeEvaluationResponseMapper {
  static toDto(source: RecipeEvaluationSource): RecipeEvaluationResponseDto {
    return {
      apiVersion: 'v1',
      recipeId: source.recipeId,
      recipeVersionId: source.recipeVersionId,
      recipeVersion: source.recipeVersion,
      portionGrams: source.portionGrams,
      evaluation: {
        ...source.evaluation,
        ...(source.evaluation.nutritionInsights == null ? {} : {
          nutritionInsights: source.evaluation.nutritionInsights.map((insight) => ({
            ...insight,
            evidence: { ...insight.evidence },
          })),
        }),
      },
      targetCalculation: {
        targets: source.targetCalculation.targets,
        targetProvenance: source.targetCalculation.targetProvenance,
        deferredPolicies: source.targetCalculation.deferredPolicies,
      },
      components: source.components.map((component) => ({ ...component, evaluation: { ...component.evaluation } })),
      provenance: {
        ...source.provenance,
        canonicalFoods: source.provenance.canonicalFoods.map((food) => ({ ...food })),
      },
      limitations: source.limitations,
    };
  }
}
