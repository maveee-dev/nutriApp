import { FoodEvaluationResponseDto } from '../dto/food-evaluation-response.dto.js';
import { FoodEvaluationSource } from '../types/food-evaluation.type.js';

export class FoodEvaluationResponseMapper {
  static toResponseDto(source: FoodEvaluationSource): FoodEvaluationResponseDto {
    return {
      score: source.score,
      reasons: source.reasons.map((reason) => ({ ...reason })),
      deferredPolicies: source.deferredPolicies.map((policy) => ({ ...policy })),
    };
  }
}
