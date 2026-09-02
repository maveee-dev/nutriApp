import { NutritionTargetResponseDto } from '../dto/response/nutrition-target-response.dto.js';
import type { NutritionTargetManagementSource } from '../types/nutrition-target-management.type.js';

export class NutritionTargetResponseMapper {
  static toDto(source: NutritionTargetManagementSource): NutritionTargetResponseDto {
    return {
      id: source.id,
      nutrient: source.nutrient,
      value: source.value,
      unit: source.unit,
      kind: source.kind,
      source: source.source,
      approvalStatus: source.approvalStatus,
      effectiveAt: source.effectiveAt,
      expirationAt: source.expirationAt,
      version: source.version,
      notes: source.notes,
      rangeMin: source.rangeMin,
      rangeMax: source.rangeMax,
    };
  }
}
