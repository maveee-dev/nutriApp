import type { MealTemplateSource } from '../../types/meal-template.source.js';
import { MealTemplateResponseDto } from '../../dto/response/meal-template-response.dto.js';

export class MealTemplateResponseMapper {
  static toDto(source: MealTemplateSource): MealTemplateResponseDto {
    return {
      id: source.id,
      ownerId: source.ownerId,
      visibility: source.visibility,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      versions: source.versions.map((version) => ({
        id: version.id,
        version: version.version,
        name: version.name,
        description: version.description,
        cuisine: version.cuisine,
        mealTypes: version.mealTypes,
        sourceType: version.sourceType,
        sourceName: version.sourceName,
        sourceUrl: version.sourceUrl,
        sourceReference: version.sourceReference,
        sourceVersion: version.sourceVersion,
        approvalStatus: version.approvalStatus,
        approvedAt: version.approvedAt,
        approvedByUserId: version.approvedByUserId,
        createdAt: version.createdAt,
        slots: version.slots.map((slot) => ({ ...slot })),
      })),
    };
  }
}
