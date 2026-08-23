import type { RecipeSource } from '../../types/recipe.source.js';
import { RecipeResponseDto } from '../../dto/response/recipe-response.dto.js';

export class RecipeResponseMapper {
  static toDto(source: RecipeSource): RecipeResponseDto {
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
        yieldServings: version.yieldServings,
        sourceType: version.sourceType,
        sourceName: version.sourceName,
        sourceUrl: version.sourceUrl,
        sourceReference: version.sourceReference,
        sourceVersion: version.sourceVersion,
        approvalStatus: version.approvalStatus,
        approvedAt: version.approvedAt,
        approvedByUserId: version.approvedByUserId,
        createdAt: version.createdAt,
        components: version.components.map((component) => ({ ...component })),
      })),
    };
  }
}
