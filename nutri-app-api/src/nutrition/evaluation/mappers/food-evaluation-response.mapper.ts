import { FoodEvaluationResponseDto } from '../dto/food-evaluation-response.dto.js';
import { FoodEvaluationSource } from '../types/food-evaluation.type.js';

export class FoodEvaluationResponseMapper {
  static toResponseDto(source: FoodEvaluationSource): FoodEvaluationResponseDto {
    return {
      score: source.score,
      evaluationStatus: source.evaluationStatus ?? 'evaluated',
      coverage: source.coverage,
      reasons: source.reasons.map((reason) => ({ ...reason })),
      contributions: source.contributions.map((contribution) => ({ ...contribution })),
      deferredPolicies: source.deferredPolicies.map((policy) => ({ ...policy })),
    };
  }
}
